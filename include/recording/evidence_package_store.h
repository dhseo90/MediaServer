// 파일 용도: 원본과 분리된 evidence-hold 패키지의 원자 게시·검증 읽기.
#pragma once
#include "recording/evidence_package.h"
#include "recording/recording_scratch_reservation.h"
#include <filesystem>
#include <memory>

namespace recording {
// 단일 호출의 고정 크기 진단이다. 원시 예외/경로/관측 자료는 담지 않는다.
struct EvidenceFailure {
    const char* first_stage{"none"};
    const char* first_code{"none"};
    const char* builder_code{"none"};
    bool exception{false},published{false},dependencies_checked{false},dependencies_current{false};
    std::uint64_t captured_revision{0},checked_revision{0};
    void Note(const char* stage,const char* code,bool thrown=false) noexcept;
};
const char* EvidenceErrorCode(const std::string&) noexcept;
void TraceEvidenceFailure(const EvidenceFailure&,const char* public_code) noexcept;
struct EvidencePayloadFields {
    std::vector<std::uint8_t> bytes;
    std::shared_ptr<ResolvedRecordingMedia> media;
};
struct EvidencePayload : RecordingMemoryValue<EvidencePayloadFields> {
    EvidencePayload()=default;
    EvidencePayload(std::vector<std::uint8_t> data,std::shared_ptr<ResolvedRecordingMedia> source){bytes=std::move(data);media=std::move(source);}
};
class EvidencePackageFile {
public:
    ~EvidencePackageFile();
    EvidencePackageFile(const EvidencePackageFile&) = delete;
    EvidencePackageFile& operator=(const EvidencePackageFile&) = delete;
    int fd() const { return fd_; }
    const EvidencePackageV1& manifest() const { return manifest_; }
    std::uint64_t AssetOffset(std::size_t index) const;
private:
    friend class EvidencePackageStore;
    EvidencePackageFile() = default;
    RecordingScratchResidency::Reservation descriptor_;
    int fd_{-1};
    std::uint64_t payload_offset_{0};
    EvidencePackageV1 manifest_;
};
class EvidencePackageStore {
public:
    struct Limits {
        std::uint64_t package_bytes{256ULL*1024*1024}, store_bytes{2ULL*1024*1024*1024};
        std::uint64_t reserved_free_bytes{256ULL*1024*1024};
        std::size_t max_packages{4096};
    };
    EvidencePackageStore(std::filesystem::path directory, Limits limits,
        std::shared_ptr<SearchModelResidency> memory=std::make_shared<SearchModelResidency>(),
        std::shared_ptr<RecordingScratchResidency> resources={})
        : memory_(std::move(memory)),resources_(std::move(resources)),directory_(std::move(directory)), limits_(limits) {}
    const std::shared_ptr<SearchModelResidency>& MemoryOwner()const{return memory_;}
    bool Recover(std::string* error) const;
    bool Publish(const EvidencePackageV1&, const std::vector<EvidencePayload>&,
        std::string* id, std::string* error, const std::function<bool()>& cancelled = {},
        const std::function<bool(const std::function<bool()>&)>& publish_guard = {},
        EvidenceFailure* diagnostic = nullptr) const;
    std::shared_ptr<EvidencePackageFile> Open(const std::string& id, std::string* error,
        const std::function<bool()>& cancelled = {}) const;
    bool ListIds(std::vector<std::string>*, std::string* error) const;
    static bool ValidId(const std::string&);
private:
    std::shared_ptr<SearchModelResidency> memory_;
    std::shared_ptr<RecordingScratchResidency> resources_;
    std::filesystem::path directory_;
    Limits limits_;
};
} // namespace recording
