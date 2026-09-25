#pragma once
#include "recording/recording_generation_receipt.h"
#include <memory>

namespace recording {
// 영수증 DTO 자체는 권위가 아니다. 이 객체는 Journal/Catalog의 private coordinator만
// 생성하며, managed lease와 원본/domain 검증은 그 coordinator가 유지한다.
// 실패/소멸 시 파일을 자동 삭제하지 않는다. 재기동 복구도 별도 검증 후 명시 수행한다.
class RecordingGenerationTransaction {
    friend class RecordingJournal;
    friend class RecordingCatalog;
#if defined(MEDIA_SERVER_RECORDING_GENERATION_TESTING)
    friend struct RecordingGenerationTransactionProbe;
    static thread_local void (*fault_hook_)(const char*);
#endif
    struct State;
    std::unique_ptr<State> state_;
    bool consumed_{false};
    RecordingGenerationTransaction();
    RecordingGenerationTransaction(const RecordingGenerationTransaction&)=delete;
    RecordingGenerationTransaction& operator=(const RecordingGenerationTransaction&)=delete;
    // fresh stage 생성까지는 영속 게시 권한을 만들지 않는다.
    bool Create(const std::filesystem::path& root,std::string* error);
    bool Load(const std::filesystem::path& root,std::uint64_t receipt_admission,std::string* error);
    const std::filesystem::path& StagePath() const;
    bool Prepare(const RecordingGenerationReceipt&,std::string* error);
    // PREPARED 영수증이 내구화된 뒤에만 실행한다. 두 경로의 nlink=2 중간 상태를
    // 정확한 기록 inode/hash와 결박하며, 알 수 없는 collision은 보존한다.
    bool Promote(std::string* error);
    bool ReplaceMarker(std::string* error);
    bool PublishIntent(std::string* error);
    bool Revalidate(std::string* error) const;
    const RecordingGenerationReceipt& Receipt() const;
    bool Describe(bool staged,const std::string&,RecordingGenerationOwnedFile*,std::string*) const;
    bool WriteReplacementMarker(const std::string&,RecordingGenerationOwnedFile*,std::string*);
    bool WriteComponent(const std::string& name,const std::string& bytes,RecordingGenerationOwnedFile*,std::string*);
    bool RestoreMarker(std::string*);
    bool Cleanup(bool committed,std::string*);
    bool CleanupUnprepared(std::string*);
    bool ValidateRecoveryOriginal(std::string*,bool* complete=nullptr) const;
    void FaultPoint(const char*) const;
public:
    ~RecordingGenerationTransaction();
};
} // namespace recording
