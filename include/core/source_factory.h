// 파일 요약: SourceSpec에 맞는 SourceWorker factory를 선언한다.
// 동작 요약: 파일, RTSP pull, WebRTC publish, HTTP/HLS URI, YouTube resolver 경로를 선택한다.
// 동작 요약: SessionManager가 source 구현 생성 세부사항을 몰라도 되게 한다.
#pragma once

#include <memory>

#include "core/source_worker.h"

namespace core {

std::unique_ptr<SourceWorker> CreateSourceWorker(const media::SourceSpec& source_spec);

}  // namespace core
