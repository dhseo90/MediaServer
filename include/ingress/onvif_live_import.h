// 파일 요약: ONVIF live source import draft 생성 API를 선언한다.
// 동작 요약: ONVIF probe/fixture 결과를 기존 SourceRegistry/PublishedView 저장 draft로 변환한다.
#pragma once

#include <string>

#include "ingress/source_view_registry.h"

namespace ingress {

RegistryResult BuildOnvifLiveImportDraft(const std::string& body);

}  // namespace ingress
