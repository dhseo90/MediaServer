// 파일 용도: caller 소유의 새 cutover stage에 후보 파일을 쓰는 writer를 선언한다.
#pragma once
#include "recording/recording_cutover_candidate.h"
#include <memory>
namespace recording {
// caller-owned fresh stage 전용. 파일을 덮어쓰거나 자동 삭제하지 않는다.
// report는 실패 후에도 유지해야 하며 ready 값은 게시 권위가 아니다.
class RecordingCutoverStageWriter {
public:
    RecordingCutoverStageWriter();
    ~RecordingCutoverStageWriter();
    RecordingCutoverStageWriter(const RecordingCutoverStageWriter&)=delete;
    RecordingCutoverStageWriter& operator=(const RecordingCutoverStageWriter&)=delete;
    bool Open(const RecordingCutoverFreshStage&,const std::string& store,
        const RecordingCutoverCandidateLimits&,RecordingCutoverCreatedFiles*,std::string*);
    bool Append(const RecordingCutoverInputRow&,std::string*);
    bool Finish(RecordingIdentityChainResult*,RecordingGenerationManifest*,std::string*);
    bool Snapshot(const RecordingCatalogSnapshot&,RecordingGenerationManifest*,std::string*);
    bool Revalidate(std::string*);
#if MEDIA_SERVER_RECORDING_GENERATION_TESTING
    // 로컬 fixture에서만 쓰는 일회 쓰기/fsync 오류 주입. 일반 빌드에는 없다.
    static thread_local int fault;
#endif
private:
    struct State;
    std::unique_ptr<State> state_;
};
}
