// 파일 요약: WebRTC HTTP transport가 소유하는 analysis rule registry backend 선언만 제공한다.
// 동작 요약: composition root가 domain port에 결속할 transport 구현을 domain header 없이 노출한다.
#pragma once

#include <string>
#include <vector>

namespace media {
struct IngressRequest;
}

namespace ingress {

std::vector<std::string> WebRtcHttpAnalysisProfileDocumentsSnapshotBackend();
std::vector<std::string> WebRtcHttpAnalysisRuleDocumentsSnapshotBackend();
std::vector<std::string> WebRtcHttpVideoAnalysisRuleDocumentsSnapshotBackend();

bool ApplyWebRtcHttpVideoAnalysisRuleToRequestBackend(media::IngressRequest* request,
                                                      std::string* error_message);

}  // namespace ingress
