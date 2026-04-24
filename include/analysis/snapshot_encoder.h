// 파일 용도: 분석 raw frame을 HTTP snapshot으로 내려보낼 수 있게 이미지 인코딩 API를 선언한다.
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
