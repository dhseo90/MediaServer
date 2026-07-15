// 파일 요약: canonical analysis category catalog를 dependency-free application DTO로 매핑한다.
#include "ingress/category_catalog_application_service.h"

#include <sstream>
#include <utility>

#include "analysis/category_tokens.h"

namespace ingress {
namespace {

std::string JsonEscape(const std::string& value) {
    std::string result;
    result.reserve(value.size() + 8);
    for (const char ch : value) {
        switch (ch) {
            case '\\': result += "\\\\"; break;
            case '"': result += "\\\""; break;
            case '\n': result += "\\n"; break;
            case '\r': result += "\\r"; break;
            case '\t': result += "\\t"; break;
            default: result += ch; break;
        }
    }
    return result;
}

std::string StringVectorJson(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) out << ",";
        out << "\"" << JsonEscape(values[i]) << "\"";
    }
    out << "]";
    return out.str();
}

}  // namespace

std::vector<CategoryCatalogItemView> CategoryCatalog() {
    const auto& catalog = analysis::CategoryTokenCatalog();
    std::vector<CategoryCatalogItemView> result;
    result.reserve(catalog.size());
    for (const auto& item : catalog) {
        CategoryCatalogItemView output;
        output.token = item.token;
        output.label_ko = item.label_ko;
        output.hint = item.hint;
        output.group = item.group;
        output.aliases = item.aliases;
        output.labels = item.labels;
        output.display_labels_ko = item.display_labels_ko;
        result.push_back(std::move(output));
    }
    return result;
}

std::string CategoryCatalogJson() {
    std::ostringstream out;
    out << "[";
    const auto categories = CategoryCatalog();
    for (std::size_t i = 0; i < categories.size(); ++i) {
        const auto& item = categories[i];
        if (i != 0) out << ",";
        out << "{"
            << "\"value\":\"" << JsonEscape(item.token) << "\","
            << "\"label\":\"" << JsonEscape(item.label_ko) << "\","
            << "\"hint\":\"" << JsonEscape(item.hint) << "\","
            << "\"group\":\"" << JsonEscape(item.group) << "\","
            << "\"aliases\":" << StringVectorJson(item.aliases) << ","
            << "\"labels\":" << StringVectorJson(item.labels) << ","
            << "\"displayLabels\":" << StringVectorJson(item.display_labels_ko)
            << "}";
    }
    out << "]";
    return out.str();
}

}  // namespace ingress
