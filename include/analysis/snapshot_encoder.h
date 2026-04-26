// 파일 요약: RawVideoFrame을 JPEG bytes로 인코딩하는 API를 선언한다.
// 동작 요약: snapshot/overlay HTTP API가 같은 encoder 계약을 사용한다.
// 동작 요약: GStreamer 미사용 빌드에서는 실패를 명확히 반환한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

struct EncodedImage {
    std::string content_type;
    std::vector<unsigned char> data;
};

bool EncodeJpeg(const RawVideoFrame& frame,
                int quality,
                EncodedImage* output,
                std::string* error_message = nullptr);

}  // namespace analysis
