// 파일 용도: 증거 manifest의 strict JSON codec과 참조·payload 경계 검증.
#include "recording/evidence_package.h"
#include "domain/strict_json.h"
#include <algorithm>
#include <charconv>
#include <set>
#include <sstream>

namespace recording {
namespace {
using Doc = ingress::StrictJsonObjectDocument;
using Type = ingress::StrictJsonType;
bool Fail(std::string* error) { if (error) *error = "evidence-invalid-manifest"; return false; }
bool Parse(const std::string& text, Doc* d) { return ingress::ParseStrictJsonObjectDocument(text, d, nullptr); }
bool Text(const Doc& d, const char* key, std::string* out) {
    const auto* v = d.Find(key); if (!v || v->type != Type::String) return false; *out = v->string_value; return true;
}
template<class T> bool Number(const Doc& d, const char* key, T* out) {
    const auto* v = d.Find(key); if (!v || v->type != Type::Number) return false;
    T n{}; const auto p = std::from_chars(v->raw.data(), v->raw.data() + v->raw.size(), n);
    if (p.ec != std::errc{} || p.ptr != v->raw.data() + v->raw.size()) return false; *out = n; return true;
}
template<class T> bool Optional(const Doc& d, const char* key, std::optional<T>* out) {
    const auto* v = d.Find(key); if (!v) return false;
    if (v->type == Type::Null) { out->reset(); return true; }
    T n{}; if (!Number(d, key, &n)) return false; *out = n; return true;
}
template<class T> std::string Optional(const std::optional<T>& v) { return v ? std::to_string(*v) : "null"; }
// 전체 입력은 strict parser가 먼저 검증한다. 여기서는 배열 요소 경계만 분리한다.
bool Array(const Doc& d, const char* key, std::vector<std::string>* output) {
    const auto* member = d.Find(key); if (!member || member->type != Type::Array) return false;
    const auto& raw = member->raw; std::vector<std::string> items;
    std::size_t start = 1; unsigned depth = 0; bool quoted = false, escape = false;
    for (std::size_t i = 1; i + 1 < raw.size(); ++i) {
        const char c = raw[i];
        if (quoted) { if (escape) escape = false; else if (c == '\\') escape = true; else if (c == '"') quoted = false; continue; }
        if (c == '"') quoted = true;
        else if (c == '{' || c == '[') ++depth;
        else if (c == '}' || c == ']') --depth;
        else if (c == ',' && !depth) { items.push_back(raw.substr(start, i - start)); start = i + 1; }
    }
    const auto tail = raw.substr(start, raw.size() - start - 1);
    if (tail.find_first_not_of(" \t\r\n") != std::string::npos) items.push_back(tail);
    *output = std::move(items); return true;
}
bool Small(const std::string& v, bool empty = true) {
    return (empty || !v.empty()) && v.size() <= 4096 && v.find('\0') == std::string::npos;
}
bool Id(const std::string& v) { return ValidateRecordingReferenceId(v, nullptr); }
// 원본 stream의 opaque track 이름이다. 파일 참조 ID가 아니며 source binding과 같은 경계로 보존한다.
bool SourceTrack(const std::string& v) {
    return !v.empty() && v.size() <= 1024 &&
        std::none_of(v.begin(), v.end(), [](unsigned char c) { return c < 32 || c == 127; });
}
bool OptionalTime(const std::optional<std::int64_t>& n) { return !n || *n >= 0; }
} // namespace
std::string EvidenceJsonQuote(const std::string& value) {
    constexpr char hex[] = "0123456789abcdef"; std::string out = "\"";
    for (unsigned char c : value) {
        if (c == '"' || c == '\\') { out += '\\'; out += static_cast<char>(c); }
        else if (c < 32) { out += "\\u00"; out += hex[c >> 4]; out += hex[c & 15]; }
        else out += static_cast<char>(c);
    }
    return out + '"';
}
bool ValidateEvidencePackage(const EvidencePackageV1& v, std::string* error) {
    if (v.schema != "media-server.evidence-package.v1" || !Id(v.channel_id) || !Small(v.hit_id, false) ||
        (v.query_kind != "structured" && v.query_kind != "visual") || v.created_at_ms <= 0 ||
        v.retention != "evidence-hold" || v.selection_policy != "uniform-source-samples-v1" ||
        (v.status != "complete" && v.status != "partial") || !Small(v.time_provenance, false) ||
        !OptionalTime(v.start_ns) || !OptionalTime(v.end_ns) || !OptionalTime(v.uncertainty_ns) ||
        v.start_ns.has_value() != v.end_ns.has_value() || (v.start_ns && *v.start_ns >= *v.end_ns) ||
        v.references.empty() || v.references.size() > 128 || v.frames.size() > 8 || v.assets.size() > 9 ||
        v.event_ids.size() > 64) return Fail(error);
    for (const auto* s : {&v.observation_id, &v.track_id, &v.analysis_namespace, &v.store_id, &v.media_epoch_id})
        if (!Small(*s)) return Fail(error);
    std::set<std::string> ids, asset_names;
    for (const auto& id : v.event_ids) if (!Id(id) || !ids.insert(id).second) return Fail(error);
    bool partial = false; std::uint64_t total = 0;
    for (std::size_t i = 0; i < v.assets.size(); ++i) {
        const auto& a = v.assets[i];
        if (a.name != "asset-" + std::to_string(i) || !asset_names.insert(a.name).second ||
            (a.content_type != "image/png" && a.content_type != "video/mp4") || !a.size_bytes ||
            a.size_bytes > 256ULL * 1024 * 1024 - total || !EvidenceIsSha256(a.sha256)) return Fail(error);
        total += a.size_bytes;
    }
    std::set<std::pair<std::string, std::string>> refs;
    std::vector<unsigned> assets(v.assets.size(), 0); unsigned recording_refs = 0, clip_refs = 0, frame_refs = 0;
    for (const auto& r : v.references) {
        if ((r.kind != "recording" && r.kind != "clip" && r.kind != "frame" && r.kind != "event" &&
             r.kind != "track" && r.kind != "observation") || !Small(r.id, false) || !Small(r.reason) || !Small(r.derivation_id) ||
            !refs.emplace(r.kind, r.id).second) return Fail(error);
        if (r.kind == "recording") ++recording_refs;
        if (r.kind == "clip") ++clip_refs;
        if (r.kind == "frame" && r.state == "preserved") ++frame_refs;
        const bool available = r.state == "preserved" || r.state == "referenced" ||
            (r.kind == "clip" && r.state == "not-applicable" && !r.reason.empty());
        if (!available && r.state != "missing" && r.state != "deleted" && r.state != "unsupported") return Fail(error);
        if (!available) { partial = true; if (r.reason.empty() || r.asset_index) return Fail(error); }
        if (r.state == "preserved") {
            if (!r.asset_index || *r.asset_index >= v.assets.size() || !EvidenceIsSha256(r.sha256) ||
                v.assets[*r.asset_index].sha256 != r.sha256 || ++assets[*r.asset_index] != 1) return Fail(error);
            if ((r.kind != "frame" && r.kind != "clip") || v.assets[*r.asset_index].content_type !=
                (r.kind == "frame" ? "image/png" : "video/mp4")) return Fail(error);
        } else if (r.asset_index) return Fail(error);
        if (!r.sha256.empty() && !EvidenceIsSha256(r.sha256)) return Fail(error);
    }
    if (recording_refs != 1 || clip_refs != 1 || frame_refs != v.frames.size() || (!partial && v.frames.empty()) ||
        std::any_of(assets.begin(), assets.end(), [](unsigned n) { return n != 1; }) ||
        (v.status == "partial") != partial) return Fail(error);
    std::int64_t previous = -1;
    for (const auto& f : v.frames) {
        if (!ValidateOpaqueId(f.segment_id, nullptr) || f.pts_ns < 0 || f.pts_ns <= previous ||
            f.presentation_ns < 0 || !f.sample_ordinal || f.width <= 0 || f.width > 4096 || f.height <= 0 || f.height > 2160 ||
            !EvidenceIsSha256(f.media_sha256) || !EvidenceIsSha256(f.sample_sha256) ||
            !EvidenceIsSha256(f.rgb_sha256) || !EvidenceIsSha256(f.png_sha256) ||
            !Id(f.source_generation) || !Id(f.media_epoch_id) || !SourceTrack(f.track_id) || !f.generation_order ||
            !OptionalTime(f.utc_ns) || !OptionalTime(f.uncertainty_ns) || !Small(f.time_provenance, false)) return Fail(error);
        if (f.locator) {
            const auto& l = *f.locator;
            if (l.schema != "media-server.frame-locator.v1" || l.segment_id != f.segment_id || !f.utc_ns ||
                l.frame.utc_ms != *f.utc_ns / 1000000 || l.frame.pts < 0 || l.frame.time_base_num <= 0 || l.frame.time_base_den <= 0 ||
                static_cast<__int128>(l.frame.pts) * l.frame.time_base_num * 1000000000 !=
                    static_cast<__int128>(f.pts_ns) * l.frame.time_base_den) return Fail(error);
        } else if (f.utc_ns) return Fail(error);
        const auto found = std::find_if(v.references.begin(), v.references.end(), [&](const auto& r) {
            return r.kind == "frame" && r.state == "preserved" && r.id == f.segment_id + ":" + std::to_string(f.pts_ns) &&
                r.sha256 == f.png_sha256 && r.asset_index && v.assets[*r.asset_index].content_type == "image/png";
        });
        if (found == v.references.end()) return Fail(error);
        previous = f.pts_ns;
    }
    if (error) error->clear(); return true;
}
std::string SerializeEvidencePackage(const EvidencePackageV1& v) {
    const auto q = EvidenceJsonQuote;
    std::string s = "{\"schema\":" + q(v.schema) + ",\"channelId\":" + q(v.channel_id) + ",\"hitId\":" + q(v.hit_id) +
        ",\"queryKind\":" + q(v.query_kind) + ",\"observationId\":" + q(v.observation_id) + ",\"trackId\":" + q(v.track_id) +
        ",\"analysisNamespace\":" + q(v.analysis_namespace) + ",\"storeId\":" + q(v.store_id) + ",\"mediaEpochId\":" + q(v.media_epoch_id) +
        ",\"createdAtMs\":" + std::to_string(v.created_at_ms) + ",\"startNs\":" + Optional(v.start_ns) + ",\"endNs\":" + Optional(v.end_ns) +
        ",\"uncertaintyNs\":" + Optional(v.uncertainty_ns) + ",\"timeProvenance\":" + q(v.time_provenance) + ",\"status\":" + q(v.status) +
        ",\"retention\":" + q(v.retention) + ",\"selectionPolicy\":" + q(v.selection_policy) + ",\"eventIds\":[";
    bool comma = false; for (const auto& id : v.event_ids) { if (comma) s += ','; comma = true; s += q(id); }
    s += "],\"references\":["; comma = false;
    for (const auto& r : v.references) {
        if (comma) s += ','; comma = true;
        s += "{\"kind\":" + q(r.kind) + ",\"id\":" + q(r.id) + ",\"state\":" + q(r.state) + ",\"reason\":" + q(r.reason) +
            ",\"sha256\":" + q(r.sha256) + ",\"assetIndex\":" + Optional(r.asset_index) + ",\"derivationId\":" + q(r.derivation_id) + '}';
    }
    s += "],\"frames\":["; comma = false;
    for (const auto& f : v.frames) {
        if (comma) s += ','; comma = true;
        s += "{\"segmentId\":" + q(f.segment_id) + ",\"mediaSha256\":" + q(f.media_sha256) + ",\"sampleSha256\":" + q(f.sample_sha256) +
            ",\"rgbSha256\":" + q(f.rgb_sha256) + ",\"pngSha256\":" + q(f.png_sha256) + ",\"sourceGeneration\":" + q(f.source_generation) +
            ",\"mediaEpochId\":" + q(f.media_epoch_id) + ",\"trackId\":" + q(f.track_id) + ",\"generationOrder\":" + std::to_string(f.generation_order) +
            ",\"sampleOrdinal\":" + std::to_string(f.sample_ordinal) + ",\"ptsNs\":" + std::to_string(f.pts_ns) +
            ",\"presentationNs\":" + std::to_string(f.presentation_ns) + ",\"utcNs\":" + Optional(f.utc_ns) +
            ",\"timeProvenance\":" + q(f.time_provenance) + ",\"uncertaintyNs\":" + Optional(f.uncertainty_ns) +
            ",\"width\":" + std::to_string(f.width) + ",\"height\":" + std::to_string(f.height) +
            ",\"frameLocator\":" + (f.locator ? SerializeFrameLocatorV1(*f.locator) : "null") + '}';
    }
    s += "],\"assets\":["; comma = false;
    for (const auto& a : v.assets) {
        if (comma) s += ','; comma = true;
        s += "{\"name\":" + q(a.name) + ",\"contentType\":" + q(a.content_type) + ",\"sha256\":" + q(a.sha256) +
            ",\"sizeBytes\":" + std::to_string(a.size_bytes) + '}';
    }
    return s + "]}";
}
bool ParseEvidencePackage(const std::string& json, EvidencePackageV1* output, std::string* error) {
    if (!output || json.size() > 1024 * 1024) return Fail(error);
    Doc d; EvidencePackageV1 v;
    if (!Parse(json, &d) || !Text(d,"schema",&v.schema) || !Text(d,"channelId",&v.channel_id) ||
        !Text(d,"hitId",&v.hit_id) || !Text(d,"queryKind",&v.query_kind) || !Text(d,"observationId",&v.observation_id) ||
        !Text(d,"trackId",&v.track_id) || !Text(d,"analysisNamespace",&v.analysis_namespace) ||
        !Text(d,"storeId",&v.store_id) || !Text(d,"mediaEpochId",&v.media_epoch_id) || !Text(d,"timeProvenance",&v.time_provenance) ||
        !Text(d,"status",&v.status) || !Text(d,"retention",&v.retention) || !Text(d,"selectionPolicy",&v.selection_policy) ||
        !Number(d,"createdAtMs",&v.created_at_ms) || !Optional(d,"startNs",&v.start_ns) || !Optional(d,"endNs",&v.end_ns) ||
        !Optional(d,"uncertaintyNs",&v.uncertainty_ns)) return Fail(error);
    std::vector<std::string> items;
    if (!Array(d,"eventIds",&items) || items.size() > 64) return Fail(error);
    for (const auto& item : items) { Doc entry; std::string id; if (!Parse("{\"id\":"+item+"}",&entry) || !Text(entry,"id",&id)) return Fail(error); v.event_ids.push_back(std::move(id)); }
    if (!Array(d,"references",&items) || items.size() > 128) return Fail(error);
    for (const auto& item : items) {
        Doc e; EvidenceReferenceV1 r;
        if (!Parse(item,&e) || !Text(e,"kind",&r.kind) || !Text(e,"id",&r.id) || !Text(e,"state",&r.state) ||
            !Text(e,"reason",&r.reason) || !Text(e,"sha256",&r.sha256) || !Optional(e,"assetIndex",&r.asset_index) || !Text(e,"derivationId",&r.derivation_id)) return Fail(error);
        v.references.push_back(std::move(r));
    }
    if (!Array(d,"frames",&items) || items.size() > 8) return Fail(error);
    for (const auto& item : items) {
        Doc e; EvidenceFrameV1 f;
        if (!Parse(item,&e) || !Text(e,"segmentId",&f.segment_id) || !Text(e,"mediaSha256",&f.media_sha256) ||
            !Text(e,"sampleSha256",&f.sample_sha256) || !Text(e,"rgbSha256",&f.rgb_sha256) || !Text(e,"pngSha256",&f.png_sha256) ||
            !Text(e,"sourceGeneration",&f.source_generation) || !Text(e,"mediaEpochId",&f.media_epoch_id) || !Text(e,"trackId",&f.track_id) ||
            !Text(e,"timeProvenance",&f.time_provenance) || !Number(e,"generationOrder",&f.generation_order) ||
            !Number(e,"sampleOrdinal",&f.sample_ordinal) || !Number(e,"ptsNs",&f.pts_ns) || !Number(e,"presentationNs",&f.presentation_ns) ||
            !Number(e,"width",&f.width) || !Number(e,"height",&f.height) || !Optional(e,"utcNs",&f.utc_ns) ||
            !Optional(e,"uncertaintyNs",&f.uncertainty_ns)) return Fail(error);
        const auto* locator = e.Find("frameLocator"); if (!locator) return Fail(error);
        if (locator->type != Type::Null) { FrameLocatorV1 parsed;
            if (locator->type != Type::Object || !ParseFrameLocatorV1(locator->raw,&parsed,nullptr)) return Fail(error); f.locator = std::move(parsed); }
        v.frames.push_back(std::move(f));
    }
    if (!Array(d,"assets",&items) || items.size() > 9) return Fail(error);
    for (const auto& item : items) {
        Doc e; EvidenceAssetV1 a;
        if (!Parse(item,&e) || !Text(e,"name",&a.name) || !Text(e,"contentType",&a.content_type) ||
            !Text(e,"sha256",&a.sha256) || !Number(e,"sizeBytes",&a.size_bytes)) return Fail(error);
        v.assets.push_back(std::move(a));
    }
    if (!ValidateEvidencePackage(v,error)) return false;
    *output = std::move(v); if (error) error->clear(); return true;
}
} // namespace recording
