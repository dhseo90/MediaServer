// 파일 용도: 완성된 영상 색인 게시본의 파생 cache. 녹화 원장의 권위가 아니다.
#pragma once
#include "recording/visual_search_index.h"
#include <filesystem>

namespace recording {
// 호출자가 전용 directory의 생성·권한·writer 직렬화를 소유한다.
// 공간 ID별 파일 분리, 임시 파일 fsync→rename→directory fsync. 부분 build는 전달하지 않는다.
// 실패한 load는 output 불변. cache 누락/손상은 원본에서 전체 재색인해야 한다.
class VisualIndexStore {
public:
    explicit VisualIndexStore(std::filesystem::path directory) : directory_(std::move(directory)) {}
    bool Save(const VisualSearchIndex&, std::string* error) const;
    bool Load(const VisualEmbeddingContract&, std::shared_ptr<const VisualSearchIndex>* output,
        std::string* error, VisualIndexLimits limits = {}) const;
private:
    std::filesystem::path directory_;
};
} // namespace recording
