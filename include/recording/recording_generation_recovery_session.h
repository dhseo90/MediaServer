#pragma once
#include "recording/recording_catalog_generation_projection.h"
#include "recording/recording_journal.h"

namespace recording {
class RecordingGenerationRecoveryRow {
    friend class RecordingJournal;
    friend class RecordingCatalog;
    RecordingGenerationRecoveryRow()=default;
    RecordingMutationV1 mutation;
    RecordingMutationLink link;
    bool retry{false};
    std::uint64_t global_ordinal{0};
    // Journal만 계산한 최초 수용 composite identity. 증분 SQL 투영에 사용한다.
    std::string identity;
};
// Journal만 발급하는 일회성 복원 권위. 외부 DTO나 공개 Open 권한이 아니다.
class RecordingGenerationRecoverySession {
    friend class RecordingJournal;
    friend class RecordingCatalog;
    RecordingGenerationRecoverySession()=default;
    RecordingCatalogGenerationProjection projection;
    std::shared_ptr<const char> epoch;
    std::size_t next{0},count{0};
    bool ended{false};
};
}
