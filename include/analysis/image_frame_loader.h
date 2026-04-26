// 파일 요약: 로컬 이미지 파일을 RawVideoFrame으로 디코딩하는 API를 선언한다.
// 동작 요약: 정적 이미지 분석 endpoint가 video analysis detector 입력을 재사용하도록 한다.
// 동작 요약: GStreamer 기반 decode 성공/실패를 구조화된 결과로 반환한다.
#pragma once

#include <filesystem>

#include "analysis/analysis_types.h"

namespace analysis {

bool DecodeImageFileToRawFrame(const std::filesystem::path& image_path,
                               RawVideoFrame* output,
                               std::string* error_message = nullptr);

}  // namespace analysis
