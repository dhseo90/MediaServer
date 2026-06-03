// 파일 용도: 제품 UI component primitive helper를 C++ 문자열 HTML로 생성한다.
#include "ingress/product_ui_components.h"

#include <sstream>

namespace ingress {
namespace {

std::string EscapeHtml(const std::string& value) {
    std::string escaped;
    escaped.reserve(value.size());
    for (const char ch : value) {
        switch (ch) {
            case '&':
                escaped += "&amp;";
                break;
            case '<':
                escaped += "&lt;";
                break;
            case '>':
                escaped += "&gt;";
                break;
            case '"':
                escaped += "&quot;";
                break;
            case '\'':
                escaped += "&#39;";
                break;
            default:
                escaped.push_back(ch);
                break;
        }
    }
    return escaped;
}

std::string ClassAttr(const std::string& base, const std::string& extra) {
    return extra.empty() ? base : base + " " + EscapeHtml(extra);
}

void AppendOptionalId(std::ostringstream& out, const std::string& id) {
    if (!id.empty()) {
        out << " id=\"" << EscapeHtml(id) << "\"";
    }
}

void AppendRawAttributes(std::ostringstream& out, const std::string& attributes) {
    if (!attributes.empty()) {
        out << " " << attributes;
    }
}

std::string ActionHtml(const ProductUiAction& action, bool button) {
    std::ostringstream out;
    const std::string class_name = action.class_name.empty() ? "button-secondary" : action.class_name;
    if (button || action.href.empty()) {
        out << "<button type=\"button\" class=\"" << EscapeHtml(class_name) << "\"";
        AppendOptionalId(out, action.id);
        if (action.pressed) {
            out << " aria-pressed=\"true\"";
        }
        AppendRawAttributes(out, action.attributes);
        out << ">" << EscapeHtml(action.label) << "</button>";
        return out.str();
    }
    out << "<a class=\"" << EscapeHtml(class_name) << "\" href=\"" << EscapeHtml(action.href) << "\"";
    AppendOptionalId(out, action.id);
    AppendRawAttributes(out, action.attributes);
    out << ">" << EscapeHtml(action.label) << "</a>";
    return out.str();
}

}  // namespace

std::string ProductUiStatusBadgeHtml(const std::string& text, const std::string& tone) {
    std::ostringstream out;
    out << "<span class=\"" << ClassAttr("chip", tone) << "\">" << EscapeHtml(text) << "</span>";
    return out.str();
}

std::string ProductUiBadgeRowHtml(const std::vector<ProductUiBadge>& badges,
                                  const std::string& extra_class,
                                  const std::string& id) {
    std::ostringstream out;
    out << "<div class=\"" << ClassAttr("badge-row", extra_class) << "\"";
    AppendOptionalId(out, id);
    out << ">";
    for (const auto& badge : badges) {
        out << ProductUiStatusBadgeHtml(badge.text, badge.tone);
    }
    out << "</div>";
    return out.str();
}

std::string ProductUiToolbarHtml(const std::string& title,
                                 const std::string& subtitle,
                                 const std::string& actions_html,
                                 const std::string& extra_class) {
    std::ostringstream out;
    out << "<div class=\"" << ClassAttr("toolbar", extra_class) << "\"><div>";
    if (!title.empty()) {
        const bool panel_title = extra_class.find("panel-title-toolbar") != std::string::npos;
        out << (panel_title ? "<h2>" : "<h3>") << EscapeHtml(title)
            << (panel_title ? "</h2>" : "</h3>");
    }
    if (!subtitle.empty()) {
        out << "<p>" << EscapeHtml(subtitle) << "</p>";
    }
    out << "</div>";
    if (!actions_html.empty()) {
        out << "<div class=\"actions\">" << actions_html << "</div>";
    }
    out << "</div>";
    return out.str();
}

std::string ProductUiSectionCardHtml(const std::string& title,
                                     const std::string& subtitle,
                                     const std::string& body_html,
                                     const std::string& actions_html,
                                     const std::string& attributes,
                                     const std::string& extra_class) {
    std::ostringstream out;
    out << "<section class=\"" << ClassAttr("section-card", extra_class) << "\"";
    AppendRawAttributes(out, attributes);
    out << ">";
    if (!title.empty() || !subtitle.empty() || !actions_html.empty()) {
        out << ProductUiToolbarHtml(title, subtitle, actions_html);
    }
    out << body_html << "</section>";
    return out.str();
}

std::string ProductUiNavTabsHtml(const std::vector<ProductUiAction>& actions,
                                 const std::string& aria_label) {
    std::ostringstream out;
    out << "<nav class=\"nav-tabs\" aria-label=\"" << EscapeHtml(aria_label) << "\">";
    for (const auto& action : actions) {
        out << ActionHtml(action, false);
    }
    out << "</nav>";
    return out.str();
}

std::string ProductUiSegmentedControlHtml(const std::vector<ProductUiAction>& actions,
                                          const std::string& aria_label) {
    std::ostringstream out;
    out << "<div class=\"rule-mode-grid\" role=\"group\" aria-label=\"" << EscapeHtml(aria_label) << "\">";
    for (const auto& action : actions) {
        out << ActionHtml(action, true);
    }
    out << "</div>";
    return out.str();
}

std::string ProductUiTableShellHtml(const std::vector<std::string>& headers,
                                    const std::string& body_html,
                                    const std::string& table_class,
                                    const std::string& id) {
    std::ostringstream out;
    out << "<div class=\"table-wrap\"><table class=\"" << EscapeHtml(table_class) << "\"";
    AppendOptionalId(out, id);
    out << "><thead><tr>";
    for (const auto& header : headers) {
        out << "<th scope=\"col\">" << EscapeHtml(header) << "</th>";
    }
    out << "</tr></thead><tbody>" << body_html << "</tbody></table></div>";
    return out.str();
}

std::string ProductUiDetailsPanelHtml(const std::string& summary,
                                      const std::string& body_html,
                                      const std::string& id,
                                      const std::string& extra_class) {
    std::ostringstream out;
    out << "<details class=\"" << ClassAttr("collapsed-editor", extra_class) << "\"";
    AppendOptionalId(out, id);
    out << "><summary>" << EscapeHtml(summary) << "</summary><div class=\"collapsed-editor-body\">"
        << body_html << "</div></details>";
    return out.str();
}

std::string ProductUiFormRowHtml(const std::string& label,
                                 const std::string& control_html,
                                 const std::string& help_html,
                                 const std::string& extra_class) {
    std::ostringstream out;
    out << "<label class=\"" << ClassAttr("form-grid", extra_class) << "\">" << EscapeHtml(label)
        << control_html;
    if (!help_html.empty()) {
        out << "<span class=\"form-note\">" << EscapeHtml(help_html) << "</span>";
    }
    out << "</label>";
    return out.str();
}

std::string ProductUiEmptyStateHtml(const std::string& message) {
    return "<div class=\"empty\">" + EscapeHtml(message) + "</div>";
}

std::string ProductUiLoadingStateHtml(const std::string& message) {
    return ProductUiEmptyStateHtml(message);
}

std::string ProductUiErrorStateHtml(const std::string& message) {
    return "<div class=\"message error\">" + EscapeHtml(message) + "</div>";
}

}  // namespace ingress
