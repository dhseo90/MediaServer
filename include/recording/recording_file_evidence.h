#pragma once
// 내부 녹화 file_evidence 발급/재검증. unsupported는 기존 녹화를 실패시키지 않는다.
#include "recording/recording_contracts.h"
#include "recording/segment_writer.h"
#include <filesystem>
#include <memory>
typedef struct _GstElement GstElement;
typedef struct _GstCaps GstCaps;
namespace recording {
class RecordingFileEvidenceCollector {
public:
    explicit RecordingFileEvidenceCollector(std::int64_t origin);
    ~RecordingFileEvidenceCollector();
    RecordingFileEvidenceCollector(const RecordingFileEvidenceCollector&)=delete;
    bool Attach(GstElement* parser,const GstCaps* input_caps) noexcept;
    void Accept(const media::Packet&) noexcept;
    std::optional<RecordingFileEvidenceV1> Finish(const std::filesystem::path&,const RecordingSourceBindingV1&,
        std::uint64_t bytes,const std::string& sha256,std::string* reason) noexcept;
private:
    struct Impl;std::unique_ptr<Impl> impl_;
};
// fd는 호출자가 안전한 부모 경로/파일 identity에 결박한다. 내용 I/O는 catalog mutex 밖에서 호출한다.
bool VerifyRecordingFileEvidenceFd(int fd,const RecordingSourceBindingV1&,std::string* error);
}
