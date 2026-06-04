// 파일 용도: 제품 UI에서 반복되는 HTML component primitive helper를 선언한다.
#pragma once

#include <string>
#include <vector>

namespace ingress {

struct ProductUiBadge {
    std::string text;
    std::string tone;
};

struct ProductUiAction {
    std::string label;
    std::string href;
    std::string id;
    std::string class_name;
    std::string attributes;
    bool pressed{false};
};

std::string ProductUiStatusBadgeHtml(const std::string& text, const std::string& tone = std::string());
std::string ProductUiBadgeRowHtml(const std::vector<ProductUiBadge>& badges,
                                  const std::string& extra_class = std::string(),
                                  const std::string& id = std::string());
std::string ProductUiToolbarHtml(const std::string& title,
                                 const std::string& subtitle = std::string(),
                                 const std::string& actions_html = std::string(),
                                 const std::string& extra_class = std::string());
std::string ProductUiSectionCardHtml(const std::string& title,
                                     const std::string& subtitle,
                                     const std::string& body_html,
                                     const std::string& actions_html = std::string(),
                                     const std::string& attributes = std::string(),
                                     const std::string& extra_class = std::string());
std::string ProductUiNavTabsHtml(const std::vector<ProductUiAction>& actions,
                                 const std::string& aria_label);
std::string ProductUiSegmentedControlHtml(const std::vector<ProductUiAction>& actions,
                                          const std::string& aria_label);
std::string ProductUiTableShellHtml(const std::vector<std::string>& headers,
                                    const std::string& body_html,
                                    const std::string& table_class,
                                    const std::string& id = std::string());
std::string ProductUiDetailsPanelHtml(const std::string& summary,
                                      const std::string& body_html,
                                      const std::string& id = std::string(),
                                      const std::string& extra_class = std::string());
std::string ProductUiFormRowHtml(const std::string& label,
                                 const std::string& control_html,
                                 const std::string& help_html = std::string(),
                                 const std::string& extra_class = std::string());
std::string ProductUiEmptyStateHtml(const std::string& message);
std::string ProductUiLoadingStateHtml(const std::string& message);
std::string ProductUiErrorStateHtml(const std::string& message);

}  // namespace ingress
