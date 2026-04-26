// 파일 용도: 로컬 이미지 파일을 분석 가능한 RGB RawVideoFrame으로 디코딩하는 API를 선언한다.
#pragma once

#include <filesystem>

#include "analysis/analysis_types.h"

namespace analysis {

bool DecodeImageFileToRawFrame(const std::filesystem::path& image_path,
                               RawVideoFrame* output,
                               std::string* error_message = nullptr);

}  // namespace analysis
