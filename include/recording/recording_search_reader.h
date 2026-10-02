// 파일 용도: 카탈로그 snapshot을 검색 모델로 연결하고 잠금 밖에서 원본 참조를 해석한다.
#pragma once
#include "recording/recording_read_service.h"
#include "recording/recording_search_source.h"

namespace recording {
class RecordingSearchReader {
public:
    RecordingSearchReader(RecordingCatalog& catalog, RecordingReadService& reader)
        : catalog_(catalog), reader_(reader) {}
    // 호출자는 channels 전체를 권한 검사한 뒤 호출한다. 실패 시 output과 previous는 불변이다.
    bool Refresh(const std::vector<std::string>& channels,
                 const std::shared_ptr<const RecordingSearchModel>& previous,
                 std::shared_ptr<const RecordingSearchModel>* output,
                 std::string* error, SearchModelLimits limits = {}) const;
    // 새 검색마다 호출한다. 카탈로그 revision과 별개인 이벤트 사실을 재사용하지 않는다.
    static bool WithEventFacts(const RecordingSearchModel& source,
        std::shared_ptr<const RecordingSearchModel>* output, std::string* error,
        SearchModelLimits limits = {});
private:
    RecordingCatalog& catalog_;
    RecordingReadService& reader_;
};
} // namespace recording
