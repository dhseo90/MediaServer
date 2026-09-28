// 파일 용도: v4.1.0 녹화 v1 계약과 golden JSONL fixture의 실제 C++ round-trip을 검증한다.
// 동작 요약: ID, 시간, lifecycle, 직렬화 호환성과 tombstone 재사용 차단을 fail-closed로 확인한다.
#include "recording/recording_contracts.h"
#include "recording/recording_store_port.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace {

int failures = 0;
int passes = 0;

void Expect(bool condition, const std::string& label) {
    if (condition) {
        ++passes;
        std::cout << "[pass] " << label << '\n';
        return;
    }
    ++failures;
    std::cerr << "[fail] " << label << '\n';
}

std::vector<std::string> ReadJsonLines(const std::filesystem::path& path) {
    std::ifstream input(path);
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(input, line)) {
        if (!line.empty()) {
            lines.push_back(line);
        }
    }
    Expect(input.eof(), "fixture를 끝까지 읽음: " + path.string());
    Expect(!lines.empty(), "fixture가 비어 있지 않음: " + path.string());
    return lines;
}

template <typename T, typename Parser, typename Serializer>
void ExpectCanonicalRoundTrip(const std::filesystem::path& path,
                              Parser parser,
                              Serializer serializer) {
    const auto lines = ReadJsonLines(path);
    for (std::size_t index = 0; index < lines.size(); ++index) {
        T first;
        std::string error;
        const bool parsed = parser(lines[index], &first, &error);
        Expect(parsed, path.filename().string() + " parse[" + std::to_string(index) + "]: " + error);
        if (!parsed) {
            continue;
        }
        const std::string canonical = serializer(first);
        T additive;
        const std::string extended = "{\"s08_future_optional\":{\"nested\":[1,true,null]}," + lines[index].substr(1);
        const bool extended_ok = parser(extended, &additive, &error);
        Expect(extended_ok && serializer(additive) == canonical,
               path.filename().string() + " additive optional known semantic parity[" + std::to_string(index) + "]");
        std::string wrong_schema = lines[index];
        const auto version = wrong_schema.find(".v1\"");
        Expect(version != std::string::npos, "V1 schema probe anchor");
        if (version != std::string::npos) wrong_schema.replace(version, 4, ".v9\"");
        T invalid;
        Expect(!parser(wrong_schema, &invalid, &error), path.filename().string() + " changed schema rejected");
        std::string missing_id = lines[index];
        const std::string id_key = path.filename() == "segments.jsonl" ? "\"segment_id\"" :
            path.filename() == "event-links.jsonl" ? "\"link_id\"" :
            path.filename() == "observations.jsonl" ? "\"observation_id\"" : "\"tombstone_id\"";
        const auto id_pos = missing_id.find(id_key);
        Expect(id_pos != std::string::npos, "required ID probe anchor");
        if (id_pos != std::string::npos) missing_id.replace(id_pos, id_key.size(), "\"unknown_removed_id\"");
        Expect(!parser(missing_id, &invalid, &error), path.filename().string() + " missing required ID rejected");
        T second;
        error.clear();
        const bool reparsed = parser(canonical, &second, &error);
        Expect(reparsed, path.filename().string() + " canonical parse[" +
                             std::to_string(index) + "]: " + error);
        if (reparsed) {
            Expect(serializer(second) == canonical,
                   path.filename().string() + " canonical parity[" + std::to_string(index) + "]");
        }
    }
}

void V2Cases() {
    using namespace recording;
    const std::string literal=R"({"schema":"media-server.recording-segment.v2","segment_id":"s","source_id":"source","channel_id":"channel","store_id":"store","order_request_id":"request","media_epoch_id":"epoch","order_sequence":9007199254740993,"media_start_pts":0,"media_end_pts":20,"time_base_num":1,"time_base_den":1000000000,"container":"mp4","video_codecs":["h264"],"audio_codecs":[],"audio_omitted_reason":"none","size_bytes":12,"checksum_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","retention_class":"continuous","lifecycle":"finalized","pinned":false,"created_at_ms":1,"finalized_at_ms":2,"mappings":[{"schema":"media-server.recording-utc-mapping.v1","mapping_id":"a","start_pts":0,"end_pts":10,"provenance":"source-capture","utc_start_ns":9007199254740993,"utc_end_ns":9007199254741003,"uncertainty_ns":0,"reason":""},{"schema":"media-server.recording-utc-mapping.v1","mapping_id":"b","start_pts":10,"end_pts":20,"provenance":"server-observation","utc_start_ns":9007199254740990,"utc_end_ns":9007199254741000,"uncertainty_ns":2,"reason":""}]})";
    RecordingSegmentV2 base;
    base.segment_id="s"; base.source_id="source"; base.channel_id="channel";base.store_id="store";
    base.order_request_id="request";base.media_epoch_id="epoch";base.order_sequence=9007199254740993LL;
    base.media_end_pts=20;base.container="mp4";base.video_codecs={"h264"};base.audio_omitted_reason="none";
    base.size_bytes=12;base.checksum_sha256=std::string(64,'a');base.created_at_ms=1;base.finalized_at_ms=2;
    base.mappings={{"media-server.recording-utc-mapping.v1","a",0,10,"source-capture",9007199254740993LL,9007199254741003LL,0,""},
                   {"media-server.recording-utc-mapping.v1","b",10,20,"server-observation",9007199254740990LL,9007199254741000LL,2,""}};
    std::string error;RecordingSegmentV2 parsed;
    Expect(ValidateRecordingSegmentV2(base,&error),"S10-M01 V2 accepts adjacent media and backward overlapping UTC mappings");
    Expect(ParseRecordingSegmentV2(literal,&parsed,&error) && parsed.order_sequence==9007199254740993LL &&
        parsed.mappings.size()==2 && parsed.mappings[0].utc_start_ns==9007199254740993LL,
        "S10-M01 literal parser preserves exact int64 above double precision");
    Expect(SerializeRecordingSegmentV2(base)==literal,"S10-M01 serializer matches independent canonical literal");
    auto unknown=base;unknown.media_end_pts.reset();auto& tail=unknown.mappings.back();tail.end_pts.reset();
    tail.provenance="unknown";tail.utc_start_ns.reset();tail.utc_end_ns.reset();tail.uncertainty_ns.reset();tail.reason="duration-missing";
    Expect(ValidateRecordingSegmentV2(unknown,&error) && ParseRecordingSegmentV2(SerializeRecordingSegmentV2(unknown),&parsed,&error) &&
        !parsed.media_end_pts && !parsed.mappings.back().utc_start_ns && parsed.mappings.back().reason=="duration-missing",
        "S10-M02 unknown final media endpoint and null UTC roundtrip");
    auto zero=base;zero.mappings[0].utc_start_ns=0;zero.mappings[0].utc_end_ns=10;
    Expect(ValidateRecordingSegmentV2(zero,&error),"S10-M02 actual UTC zero remains known");
    const auto reject=[&](RecordingSegmentV2 value,const std::string& label){Expect(!ValidateRecordingSegmentV2(value,&error),label);};
    auto v=base;v.mappings.clear();reject(v,"S10-M03 empty mappings rejected");
    v=base;v.mappings[0].start_pts=1;reject(v,"S10-M03 initial media gap rejected");
    v=base;v.mappings[1].start_pts=11;reject(v,"S10-M03 interior media gap rejected");
    v=base;v.mappings[1].start_pts=9;reject(v,"S10-M03 media overlap rejected");
    v=base;v.mappings.back().end_pts=19;reject(v,"S10-M03 final media gap rejected");
    v=base;v.mappings[1].mapping_id="a";reject(v,"S10-M03 duplicate mapping ID rejected");
    v=base;v.mappings[0].end_pts=0;reject(v,"S10-M03 reversed mapping media rejected");
    v=base;v.media_end_pts=0;reject(v,"S10-M03 reversed segment media rejected");
    v=base;v.mappings[0].end_pts.reset();reject(v,"S10-M03 nonfinal unknown media end rejected");
    v=base;v.mappings[0].utc_end_ns.reset();reject(v,"S10-M03 known missing UTC endpoint rejected");
    v=base;v.mappings[0].uncertainty_ns=-1;reject(v,"S10-M03 negative uncertainty rejected");
    v=base;v.mappings[0].utc_end_ns=v.mappings[0].utc_start_ns;reject(v,"S10-M03 nonincreasing known UTC rejected");
    v=unknown;v.mappings.back().utc_start_ns=0;reject(v,"S10-M03 unknown with UTC value rejected");
    v=unknown;v.mappings.back().reason.clear();reject(v,"S10-M03 unknown without reason rejected");
    v=base;v.mappings[0].provenance="estimated";reject(v,"S10-M03 estimated without reason rejected");
    v=base;v.mappings[0].reason=std::string(257,'x');reject(v,"S10-M04 reason byte limit rejected");
    v=base;v.mappings.clear();v.media_end_pts=256;
    for(int i=0;i<256;++i){auto m=base.mappings[0];m.mapping_id="m"+std::to_string(i);m.start_pts=i;m.end_pts=i+1;v.mappings.push_back(m);}
    Expect(ValidateRecordingSegmentV2(v,&error) && ParseRecordingSegmentV2(SerializeRecordingSegmentV2(v),&parsed,&error) && parsed.mappings.size()==256,
        "S10-M04 exact 256 unique adjacent mappings accepted");
    auto extra=v.mappings.back();extra.mapping_id="m256";extra.start_pts=256;extra.end_pts=257;v.mappings.push_back(extra);v.media_end_pts=257;
    reject(v,"S10-M04 mapping count limit rejected");
    v=base;v.mappings[0].provenance="estimated";v.mappings[0].reason=std::string(256,'x');
    Expect(ValidateRecordingSegmentV2(v,&error),"S10-M04 exact 256 byte estimated reason accepted");
    v=unknown;v.media_end_pts=20;v.mappings.back().end_pts=20;
    Expect(ValidateRecordingSegmentV2(v,&error) && ParseRecordingSegmentV2(SerializeRecordingSegmentV2(v),&parsed,&error) && parsed.media_end_pts==20 &&
        !parsed.mappings.back().utc_start_ns,"S10-M02 bounded unknown mapping preserves media endpoint");
    Expect(ParseRecordingSegmentV2(std::string(1024*1024-literal.size(),' ')+literal,&parsed,&error),"S10-M04 exact JSON size limit accepted");
    v=base;v.order_sequence=0;reject(v,"S10-M04 nonpositive order rejected");
    v=base;v.time_base_num=0;reject(v,"S10-M04 nonpositive timebase rejected");
    v=base;v.segment_id="../invalid";reject(v,"S10-M04 invalid opaque ID rejected");
    v=base;v.lifecycle=RecordingLifecycle::Writing;reject(v,"S10-M04 nonfinalized lifecycle rejected");
    v=base;v.checksum_sha256="bad";reject(v,"S10-M04 invalid physical integrity rejected");
    v=base;v.retention_class=RecordingRetentionClass::Unknown;reject(v,"S10-M04 V2 unknown retention rejected");
    v=base;v.container=std::string(1024*1024+1,'x');
    Expect(!ValidateRecordingSegmentV2(v,&error) && SerializeRecordingSegmentV2(v).empty(),
        "S10-M04 oversized physical string rejected by validator and serializer");
    const auto changed=[&](const std::string& from,const std::string& to){auto x=literal;const auto p=x.find(from);if(p==std::string::npos)throw std::runtime_error("fixture anchor missing");x.replace(p,from.size(),to);return x;};
    const std::vector<std::pair<std::string,std::string>> invalid={
      {"schema",changed("recording-segment.v2","recording-segment.v9")},
      {"unknown-key","{\"extra\":1,"+literal.substr(1)},
      {"duplicate-key","{\"schema\":\"x\","+literal.substr(1)},
      {"integer-overflow",changed("9007199254740993","9223372036854775808")},
      {"fraction",changed("\"order_sequence\":9007199254740993","\"order_sequence\":1.5")},
      {"wrong-type",changed("\"pinned\":false","\"pinned\":0")},
      {"timebase-overflow",changed("\"time_base_den\":1000000000","\"time_base_den\":2147483648")},
      {"mapping-schema",changed("recording-utc-mapping.v1","recording-utc-mapping.v9")},
      {"provenance",changed("source-capture","unsupported")},
      {"unknown-retention",changed("\"retention_class\":\"continuous\"","\"retention_class\":\"unknown\"")},
      {"mapping-key",changed("\"mapping_id\":\"a\"","\"unexpected\":0,\"mapping_id\":\"a\"")},
      {"json-cap",std::string(1024*1024+1,' ')+literal}};
    for(const auto& item:invalid){parsed.segment_id="sentinel";Expect(!ParseRecordingSegmentV2(item.second,&parsed,&error)&&parsed.segment_id=="sentinel",
        "S10-M04 parser rejects and preserves output "+item.first);}
    Expect(!ParseRecordingSegmentV2(literal,nullptr,&error),"S10-M04 parser null output rejected");
}
}  // namespace

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "usage: recording_contract_smoke <fixture-root>\n";
        return 2;
    }
    const std::filesystem::path root(argv[1]);
    std::string error;

    Expect(recording::ValidateOpaqueId("segment-01", &error), "opaque ID 허용");
    Expect(!recording::ValidateOpaqueId("", &error), "빈 opaque ID 거부");
    Expect(!recording::ValidateOpaqueId("../segments/1", &error), "path opaque ID 거부");
    Expect(!recording::ValidateOpaqueId("42", &error), "SQLite rowid 형태 opaque ID 거부");

    Expect(recording::HalfOpenRangesOverlap(1000, 2000, 1999, 3000), "반개구간 겹침");
    Expect(!recording::HalfOpenRangesOverlap(1000, 2000, 2000, 3000), "맞닿은 반개구간 비겹침");
    Expect(!recording::HalfOpenRangesOverlap(1000, 1000, 1000, 2000), "빈 반개구간 거부");

    const auto segment_lines = ReadJsonLines(root / "segments.jsonl");
    Expect(segment_lines.size() == 2, "V1 segment golden row count");
    if (!segment_lines.empty()) {
        recording::RecordingSegmentV1 segment;
        const bool parsed = recording::ParseRecordingSegmentV1(segment_lines.front(), &segment, &error);
        Expect(parsed, "unknown optional field를 포함한 segment parse: " + error);
        if (parsed) {
            Expect(segment.source_id == "source-1" && segment.channel_id == "channel-1" &&
                segment.stream_epoch_id == "epoch-alpha-1", "segment provenance semantic");
            Expect(segment.start.utc_ms == 1767225600000LL && segment.end.utc_ms == 1767225605000LL &&
                segment.end.pts == 540000 && segment.end.time_base_num == 1 && segment.end.time_base_den == 90000,
                "segment UTC/end PTS semantic");
            Expect(segment.container == "mp4" && segment.video_codecs == std::vector<std::string>{"h264"} &&
                segment.audio_codecs.empty() && segment.audio_omitted_reason == "source-no-audio" &&
                segment.size_bytes == 1048576 && segment.checksum_sha256 == std::string(64, '1'), "segment media/checksum semantic");
            Expect(segment.retention_class == recording::RecordingRetentionClass::Continuous &&
                segment.lifecycle == recording::RecordingLifecycle::Finalized && !segment.pinned &&
                segment.created_at_ms == 1767225600000LL && segment.finalized_at_ms == 1767225605100LL,
                "segment lifecycle/retention semantic");
            Expect(segment.segment_id == "seg-alpha-0001", "unknown optional field 뒤 known ID 보존");
            Expect(segment.start.pts == 90000 && segment.start.time_base_num == 1 &&
                       segment.start.time_base_den == 90000,
                   "PTS/timebase exact 보존");
            recording::RecordingSegmentV1 reparsed;
            const std::string serialized = recording::SerializeRecordingSegmentV1(segment);
            Expect(serialized.find("media_path") == std::string::npos,
                   "public JSON에 filesystem path 비노출");
            Expect(recording::ParseRecordingSegmentV1(serialized, &reparsed, &error),
                   "segment canonical 재parse");
            Expect(reparsed.start.pts == segment.start.pts &&
                       reparsed.start.time_base_num == segment.start.time_base_num &&
                       reparsed.start.time_base_den == segment.start.time_base_den,
                   "PTS/timebase round-trip");
        }
    }

    const std::string unknown_lifecycle =
        R"({"schema":"media-server.recording-segment.v1","segment_id":"seg-unknown-0001","source_id":"source-1","channel_id":"channel-1","stream_epoch_id":"epoch-1","start":{"utc_ms":1000,"pts":0,"time_base_num":1,"time_base_den":90000},"end":{"utc_ms":2000,"pts":90000,"time_base_num":1,"time_base_den":90000},"container":"mp4","video_codecs":["h264"],"audio_codecs":[],"audio_omitted_reason":"source-no-audio","size_bytes":1,"checksum_sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","retention_class":"continuous","lifecycle":"future-state","pinned":false,"created_at_ms":1000,"finalized_at_ms":0})";
    recording::RecordingSegmentV1 unknown;
    Expect(recording::ParseRecordingSegmentV1(unknown_lifecycle, &unknown, &error),
           "unknown lifecycle를 호환 parse");
    Expect(unknown.lifecycle == recording::RecordingLifecycle::Unknown,
           "unknown lifecycle를 Unknown으로 보존");
    Expect(!recording::IsPlayable(unknown.lifecycle), "unknown lifecycle 비재생");

    ExpectCanonicalRoundTrip<recording::RecordingSegmentV1>(
        root / "segments.jsonl", recording::ParseRecordingSegmentV1,
        recording::SerializeRecordingSegmentV1);
    ExpectCanonicalRoundTrip<recording::EventRecordingLinkV1>(
        root / "event-links.jsonl", recording::ParseEventRecordingLinkV1,
        recording::SerializeEventRecordingLinkV1);
    ExpectCanonicalRoundTrip<recording::AnalysisObservationV1>(
        root / "observations.jsonl", recording::ParseAnalysisObservationV1,
        recording::SerializeAnalysisObservationV1);
    ExpectCanonicalRoundTrip<recording::RecordingTombstoneV1>(
        root / "tombstones.jsonl", recording::ParseRecordingTombstoneV1,
        recording::SerializeRecordingTombstoneV1);

    recording::RecordingTombstoneV1 tombstone;
    const auto links = ReadJsonLines(root / "event-links.jsonl");
    recording::EventRecordingLinkV1 link;
    if (links.size() == 1 && recording::ParseEventRecordingLinkV1(links[0], &link, &error)) {
        Expect(link.link_id == "link-event-0001" && link.event_id == "event-0001" &&
            link.source_id == "source-1" && link.channel_id == "channel-1", "link ID/provenance semantic");
        Expect(link.requested_range && link.requested_range->start_ms == 1767225601000LL &&
            link.requested_range->end_ms == 1767225606000LL && link.time_basis == "utc-ms" &&
            link.status == recording::EventRecordingLinkStatus::Partial, "link requested range/status semantic");
        Expect(link.ordered_overlaps.size() == 2 && link.ordered_overlaps[0].segment_id == "seg-alpha-0001" &&
            link.ordered_overlaps[1].segment_id == "seg-event-0001" && link.missing_ranges.size() == 1 &&
            link.missing_ranges[0].start_ms == 1767225605000LL && link.missing_ranges[0].end_ms == 1767225606000LL,
            "link overlap/missing semantic");
        Expect(link.derived_segment_id == "seg-event-0001" && link.fallback_evidence_id == "evidence-0001" &&
            link.fallback_media_locator == "/evidence/event-0001/manifest.json" &&
            link.created_at_ms == 1767225606100LL && link.updated_at_ms == 1767225606200LL, "link fallback/time semantic");
    } else Expect(false, "link golden parse/count");
    const auto observations = ReadJsonLines(root / "observations.jsonl");
    recording::AnalysisObservationV1 observation;
    if (observations.size() == 1 && recording::ParseAnalysisObservationV1(observations[0], &observation, &error)) {
        Expect(observation.observation_id == "observation-0001" && observation.source_id == "source-1" &&
            observation.channel_id == "channel-1" && observation.frame_locator.segment_id == "seg-alpha-0001",
            "observation ID/provenance semantic");
        const auto& frame = observation.frame_locator;
        Expect(frame.frame.utc_ms == 1767225602500LL && frame.frame.pts == 315000 &&
            frame.frame.time_base_num == 1 && frame.frame.time_base_den == 90000 &&
            frame.frame_index == 75 && frame.keyframe_pts == 270000, "observation exact locator semantic");
        Expect(observation.track_id == "track-0001" && observation.class_label == "person" &&
            observation.confidence == 0.93 && observation.bbox.x == 0.1 && observation.bbox.y == 0.2 &&
            observation.bbox.width == 0.3 && observation.bbox.height == 0.4, "observation detection semantic");
        Expect(observation.zone_ids == std::vector<std::string>{"zone-entrance"} && observation.line_ids.empty() &&
            observation.rule_ids == std::vector<std::string>{"rule-loitering"} &&
            observation.scenario_ids == std::vector<std::string>{"scenario-vehicle-nearby"} &&
            observation.event_ids == std::vector<std::string>{"event-0001"} &&
            observation.selection_reason == "event-boundary" && observation.created_at_ms == 1767225602510LL,
            "observation association/time semantic");
    } else Expect(false, "observation golden parse/count");
    const auto tombstone_lines = ReadJsonLines(root / "tombstones.jsonl");
    if (!tombstone_lines.empty() &&
        recording::ParseRecordingTombstoneV1(tombstone_lines.front(), &tombstone, &error)) {
        Expect(tombstone.tombstone_id == "tombstone-0001" && tombstone.segment_id == "seg-deleted-0001" &&
            tombstone.source_id == "source-1" && tombstone.channel_id == "channel-1", "tombstone ID/provenance semantic");
        Expect(tombstone.recorded_range.start_ms == 1767139200000LL && tombstone.recorded_range.end_ms == 1767139205000LL &&
            tombstone.checksum_sha256 == std::string(64, '3') &&
            tombstone.retention_class == recording::RecordingRetentionClass::Unknown &&
            tombstone.deletion_reason == "continuous-quota-oldest-first" && tombstone.deleted_at_ms == 1767225607000LL,
            "tombstone range/checksum/legacy retention semantic");
        Expect(!recording::CanCreateSegmentId(tombstone.segment_id, {tombstone}, &error),
               "tombstone segment ID 재사용 거부");
        Expect(recording::CanCreateSegmentId("seg-new-0002", {tombstone}, &error),
               "새 segment ID 허용");
    }

    V2Cases();
    std::cout << "[verify-v410-recording-contracts] pass=" << passes
              << " fail=" << failures << '\n';
    return failures == 0 ? 0 : 1;
}
