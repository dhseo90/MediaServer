// 파일 용도: Ops shell/dashboard/rules/events/home/VLM 제품 HTML renderer 공개 API를 선언한다.
#pragma once

#include <iosfwd>
#include <string>

#include "ingress/product_ui_principal_view.h"

namespace ingress {

void AppendOpsShellStart(std::ostringstream& out,
                         const ProductUiPrincipalView& principal,
                         const std::string& active,
                         const std::string& subtitle);
void AppendOpsShellEnd(std::ostringstream& out);
std::string OpsShellPageHtml(const std::string& stream_route,
                             int rtsp_listen_port,
                             const ProductUiPrincipalView& principal,
                             const std::string& active);

}  // namespace ingress
