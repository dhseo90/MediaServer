#include "domain/strict_json.h"
// 파일 용도: 중복 키와 타입 경계를 엄격히 검사하는 JSON parser를 구현한다.
#include <cctype>
#include <array>
#include <algorithm>
#include <limits>
#include <stdexcept>
#include <cstdint>
#include <string_view>
#include <unordered_set>
#include <utility>

namespace ingress {

namespace {

class StrictJsonParser {
public:
    StrictJsonParser(const std::string& json,
                     StrictJsonObjectDocument* document,
                     std::string* error_message, bool array_views = false, bool key_index = true)
        : json_(json), document_(document), error_message_(error_message), array_views_(array_views), key_index_(key_index) {}

    bool Parse() {
        if (document_ == nullptr) {
            return Fail("output document is null");
        }
        document_->members.clear();
        document_->all_keys.clear();
        SkipWhitespace();
        if (!ParseObject("$", &document_->members, 0)) {
            return false;
        }
        SkipWhitespace();
        if (pos_ != json_.size()) {
            return Fail("trailing bytes");
        }
        if (error_message_ != nullptr) {
            error_message_->clear();
        }
        return true;
    }

private:
    struct ParsedValue {
        StrictJsonType type{StrictJsonType::Null};
        std::size_t start{0};
        std::size_t end{0};
        std::string string_value;
        bool bool_value{false};
    };

    bool ParseObject(const std::string& path,
                     std::vector<StrictJsonMember>* captured_members,
                     std::size_t depth) {
        if (depth > 128) {
            return Fail("nesting limit exceeded");
        }
        if (!Consume('{')) {
            return Fail("expected object");
        }
        SkipWhitespace();
        if (Consume('}')) {
            return true;
        }
        std::unordered_set<std::string> keys;
        while (pos_ < json_.size()) {
            std::string key;
            if (!ParseString(&key)) {
                return Fail("invalid object key");
            }
            if (!keys.insert(key).second) {
                return Fail("duplicate JSON key at " + path + "." + key);
            }
            if (key_index_) document_->all_keys.insert(key);
            SkipWhitespace();
            if (!Consume(':')) {
                return Fail("missing object colon");
            }
            SkipWhitespace();
            ParsedValue value;
            if (!ParseValue(path + "." + key, &value, depth + 1)) {
                return false;
            }
            if (captured_members != nullptr) {
                captured_members->push_back(StrictJsonMember{
                    key,
                    value.type,
                    array_views_ && value.type == StrictJsonType::Array ? std::string{} : json_.substr(value.start, value.end - value.start),
                    std::move(value.string_value),
                    value.bool_value,
                    array_views_ && value.type == StrictJsonType::Array ? std::string_view(json_).substr(value.start, value.end-value.start) : std::string_view{},
                });
            }
            SkipWhitespace();
            if (Consume('}')) {
                return true;
            }
            if (!Consume(',')) {
                return Fail("missing object comma");
            }
            SkipWhitespace();
        }
        return Fail("unterminated object");
    }

    bool ParseArray(const std::string& path, std::size_t depth) {
        if (depth > 128) {
            return Fail("nesting limit exceeded");
        }
        if (!Consume('[')) {
            return Fail("expected array");
        }
        SkipWhitespace();
        if (Consume(']')) {
            return true;
        }
        std::size_t index = 0;
        while (pos_ < json_.size()) {
            ParsedValue value;
            if (!ParseValue(path + "[" + std::to_string(index) + "]", &value, depth + 1)) {
                return false;
            }
            ++index;
            SkipWhitespace();
            if (Consume(']')) {
                return true;
            }
            if (!Consume(',')) {
                return Fail("missing array comma");
            }
            SkipWhitespace();
        }
        return Fail("unterminated array");
    }

    bool ParseValue(const std::string& path, ParsedValue* value, std::size_t depth) {
        if (value == nullptr || pos_ >= json_.size()) {
            return Fail("missing value");
        }
        value->start = pos_;
        const char ch = json_[pos_];
        if (ch == '{') {
            value->type = StrictJsonType::Object;
            if (!ParseObject(path, nullptr, depth)) return false;
        } else if (ch == '[') {
            value->type = StrictJsonType::Array;
            if (!ParseArray(path, depth)) return false;
        } else if (ch == '"') {
            value->type = StrictJsonType::String;
            if (!ParseString(&value->string_value)) return false;
        } else if (ch == 't') {
            value->type = StrictJsonType::Bool;
            value->bool_value = true;
            if (!ConsumeLiteral("true")) return Fail("invalid true literal");
        } else if (ch == 'f') {
            value->type = StrictJsonType::Bool;
            value->bool_value = false;
            if (!ConsumeLiteral("false")) return Fail("invalid false literal");
        } else if (ch == 'n') {
            value->type = StrictJsonType::Null;
            if (!ConsumeLiteral("null")) return Fail("invalid null literal");
        } else {
            value->type = StrictJsonType::Number;
            if (!ParseNumber()) return Fail("invalid number");
        }
        value->end = pos_;
        return true;
    }

    bool ParseString(std::string* decoded) {
        if (!Consume('"')) {
            return false;
        }
        std::string out;
        while (pos_ < json_.size()) {
            const unsigned char ch = static_cast<unsigned char>(json_[pos_++]);
            if (ch == '"') {
                if (decoded != nullptr) {
                    *decoded = std::move(out);
                }
                return true;
            }
            if (ch < 0x20) {
                return false;
            }
            if (ch != '\\') {
                out.push_back(static_cast<char>(ch));
                continue;
            }
            if (pos_ >= json_.size()) {
                return false;
            }
            const char escaped = json_[pos_++];
            switch (escaped) {
                case '"': out.push_back('"'); break;
                case '\\': out.push_back('\\'); break;
                case '/': out.push_back('/'); break;
                case 'b': out.push_back('\b'); break;
                case 'f': out.push_back('\f'); break;
                case 'n': out.push_back('\n'); break;
                case 'r': out.push_back('\r'); break;
                case 't': out.push_back('\t'); break;
                case 'u': {
                    std::uint32_t codepoint = 0;
                    if (!ParseHexCodeUnit(&codepoint)) return false;
                    if (codepoint >= 0xD800 && codepoint <= 0xDBFF) {
                        if (pos_ + 2 > json_.size() || json_[pos_] != '\\' || json_[pos_ + 1] != 'u') {
                            return false;
                        }
                        pos_ += 2;
                        std::uint32_t low = 0;
                        if (!ParseHexCodeUnit(&low) || low < 0xDC00 || low > 0xDFFF) return false;
                        codepoint = 0x10000 + ((codepoint - 0xD800) << 10) + (low - 0xDC00);
                    } else if (codepoint >= 0xDC00 && codepoint <= 0xDFFF) {
                        return false;
                    }
                    AppendUtf8(codepoint, &out);
                    break;
                }
                default: return false;
            }
        }
        return false;
    }

    bool ParseHexCodeUnit(std::uint32_t* value) {
        if (value == nullptr || pos_ + 4 > json_.size()) return false;
        std::uint32_t parsed = 0;
        for (int index = 0; index < 4; ++index) {
            const char ch = json_[pos_++];
            parsed <<= 4;
            if (ch >= '0' && ch <= '9') parsed |= static_cast<std::uint32_t>(ch - '0');
            else if (ch >= 'a' && ch <= 'f') parsed |= static_cast<std::uint32_t>(ch - 'a' + 10);
            else if (ch >= 'A' && ch <= 'F') parsed |= static_cast<std::uint32_t>(ch - 'A' + 10);
            else return false;
        }
        *value = parsed;
        return true;
    }

    static void AppendUtf8(std::uint32_t codepoint, std::string* out) {
        if (out == nullptr) return;
        if (codepoint <= 0x7F) {
            out->push_back(static_cast<char>(codepoint));
        } else if (codepoint <= 0x7FF) {
            out->push_back(static_cast<char>(0xC0 | (codepoint >> 6)));
            out->push_back(static_cast<char>(0x80 | (codepoint & 0x3F)));
        } else if (codepoint <= 0xFFFF) {
            out->push_back(static_cast<char>(0xE0 | (codepoint >> 12)));
            out->push_back(static_cast<char>(0x80 | ((codepoint >> 6) & 0x3F)));
            out->push_back(static_cast<char>(0x80 | (codepoint & 0x3F)));
        } else {
            out->push_back(static_cast<char>(0xF0 | (codepoint >> 18)));
            out->push_back(static_cast<char>(0x80 | ((codepoint >> 12) & 0x3F)));
            out->push_back(static_cast<char>(0x80 | ((codepoint >> 6) & 0x3F)));
            out->push_back(static_cast<char>(0x80 | (codepoint & 0x3F)));
        }
    }

    bool ParseNumber() {
        const std::size_t start = pos_;
        if (Consume('-') && pos_ >= json_.size()) return false;
        if (Consume('0')) {
            if (pos_ < json_.size() && std::isdigit(static_cast<unsigned char>(json_[pos_])) != 0) {
                return false;
            }
        } else {
            if (pos_ >= json_.size() || json_[pos_] < '1' || json_[pos_] > '9') return false;
            while (pos_ < json_.size() && std::isdigit(static_cast<unsigned char>(json_[pos_])) != 0) ++pos_;
        }
        if (Consume('.')) {
            if (pos_ >= json_.size() || std::isdigit(static_cast<unsigned char>(json_[pos_])) == 0) return false;
            while (pos_ < json_.size() && std::isdigit(static_cast<unsigned char>(json_[pos_])) != 0) ++pos_;
        }
        if (pos_ < json_.size() && (json_[pos_] == 'e' || json_[pos_] == 'E')) {
            ++pos_;
            if (pos_ < json_.size() && (json_[pos_] == '+' || json_[pos_] == '-')) ++pos_;
            if (pos_ >= json_.size() || std::isdigit(static_cast<unsigned char>(json_[pos_])) == 0) return false;
            while (pos_ < json_.size() && std::isdigit(static_cast<unsigned char>(json_[pos_])) != 0) ++pos_;
        }
        return pos_ > start;
    }

    void SkipWhitespace() {
        while (pos_ < json_.size()) {
            const char ch = json_[pos_];
            if (ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r') break;
            ++pos_;
        }
    }

    bool Consume(char expected) {
        if (pos_ >= json_.size() || json_[pos_] != expected) return false;
        ++pos_;
        return true;
    }

    bool ConsumeLiteral(std::string_view literal) {
        if (json_.compare(pos_, literal.size(), literal) != 0) return false;
        pos_ += literal.size();
        return true;
    }

    bool Fail(const std::string& reason) {
        if (error_message_ != nullptr) {
            *error_message_ = reason;
        }
        return false;
    }

    const std::string& json_;
    StrictJsonObjectDocument* document_{nullptr};
    std::string* error_message_{nullptr};
    std::size_t pos_{0};
    bool array_views_{false};
    bool key_index_{true};
};

}  // namespace

const StrictJsonMember* StrictJsonObjectDocument::Find(const std::string& key) const {
    for (const auto& member : members) {
        if (member.key == key) return &member;
    }
    return nullptr;
}

bool ParseStrictJsonObjectDocument(const std::string& json,
                                   StrictJsonObjectDocument* document,
                                   std::string* error_message) {
    StrictJsonParser parser(json, document, error_message);
    return parser.Parse();
}

bool ParseStrictJsonObjectDocumentWithoutKeyIndex(const std::string& json,
                                                  StrictJsonObjectDocument* document,
                                                  std::string* error_message) {
    StrictJsonParser parser(json, document, error_message, false, false);
    return parser.Parse();
}

StrictJsonStorageShape InspectStrictJsonStorageShape(std::string_view json) {
    // A lexical census does not accept JSON: the unchanged strict validator runs
    // afterwards. Fixed stack matches its existing depth contract (root depth 0).
    struct Frame {char kind;std::size_t keys{0},key_bytes{0};bool next{true};std::size_t start{0},element_start{0};};
    std::array<Frame,129> stack{};std::size_t depth=0;
    StrictJsonStorageShape result;
    std::size_t live_keys=0,live_key_bytes=0,max_keys=0,max_key_bytes=0;
    auto add=[](std::size_t& total,std::size_t amount) {
        if(amount>std::numeric_limits<std::size_t>::max()-total)throw std::overflow_error("JSON storage census overflow");
        total+=amount;
    };
    auto finish=[&]{result.max_live_keys=max_keys;result.max_live_key_bytes=max_key_bytes;return result;};
    for(std::size_t i=0;i<json.size();) {
        const char c=json[i];
        if(c==' '||c=='\n'||c=='\r'||c=='\t'){++i;continue;}
        if(depth&&stack[depth-1].kind=='['&&stack[depth-1].next&&c!=']') {
            add(result.array_elements,1);stack[depth-1].next=false;stack[depth-1].element_start=i;
        }
        if(c=='"') {
            const auto start=i++;
            while(i<json.size()) {const char q=json[i++];if(q=='\\'){if(i<json.size())++i;}
                else if(q=='"')break;}
            const auto bytes=i-start;add(result.strings,1);add(result.string_bytes,bytes);
            result.largest_string_bytes=std::max(result.largest_string_bytes,bytes);
            auto next=i;while(next<json.size()&&(json[next]==' '||json[next]=='\n'||json[next]=='\r'||json[next]=='\t'))++next;
            if(next<json.size()&&json[next]==':'&&depth&&stack[depth-1].kind=='{') {
                add(stack[depth-1].keys,1);add(stack[depth-1].key_bytes,bytes);
                add(live_keys,1);add(live_key_bytes,bytes);add(result.total_keys,1);
                max_keys=std::max(max_keys,live_keys);max_key_bytes=std::max(max_key_bytes,live_key_bytes);
                if(depth==1)add(result.top_members,1);
            } else {
                add(result.value_strings,1);add(result.value_string_bytes,bytes);
                if(depth==1)add(result.top_string_bytes,bytes);
            }
            continue;
        }
        if(c=='{'||c=='[') {
            if(depth==stack.size())return finish();
            stack[depth++]={c,0,0,true,i,0};result.max_depth=std::max(result.max_depth,depth);
        } else if(c=='}'||c==']') {
            if(!depth)return finish();
            const auto& frame=stack[depth-1];
            if(frame.kind=='['&&!frame.next)result.max_array_element_bytes=std::max(result.max_array_element_bytes,i-frame.element_start);
            if(depth==2&&frame.kind=='{')add(result.top_object_bytes,i+1-frame.start);
            live_keys-=frame.keys;live_key_bytes-=frame.key_bytes;--depth;
        } else if(c==','&&depth) {
            auto& frame=stack[depth-1];
            if(frame.kind=='['&&!frame.next)result.max_array_element_bytes=std::max(result.max_array_element_bytes,i-frame.element_start);
            frame.next=true;
        }
        ++i;
    }
    return finish();
}

std::size_t StrictJsonWorkspaceBytes(std::string_view json,std::size_t raw_copy_layers,
                                   std::size_t largest_typed_array_element,bool collect_all_keys) {
    const auto s=InspectStrictJsonStorageShape(json);
    std::size_t total=64*1024;
    auto term=[&](std::size_t count,std::size_t size) {
        if(size&&count>(std::numeric_limits<std::size_t>::max()-total)/size)
            throw std::overflow_error("JSON workspace overflow");
        total+=count*size;
    };
    const auto depth=std::max(std::size_t{1},s.max_depth);
    // Each owning typed parser can retain ancestor documents while descending.
    // At most depth captured vectors, key sets and ancestor path strings coexist.
    term(s.max_live_keys,depth*(2*sizeof(StrictJsonMember)+128));
    term(s.max_live_key_bytes,2*depth+2);
    if(collect_all_keys)term(s.total_keys,depth*(128+sizeof(std::string)));
    // SplitArray and typed vectors can temporarily retain old+new geometrically
    // grown buffers (3x logical elements). A zero typed size is scalar-only.
    term(s.array_elements,3*sizeof(std::string));
    for(unsigned i=0;i<3;++i)term(s.array_elements,largest_typed_array_element);
    // Four simultaneous decoded/copy owners with geometric string capacity;
    // parser keys/raw strings are included in encoded string_bytes too.
    term(s.string_bytes,8);term(s.strings,64);
    term(json.size(),raw_copy_layers);
    return total;
}

bool ParseStrictJsonObjectDocumentArrayViews(const std::string& json,
                                             StrictJsonObjectDocument* document,
                                             std::string* error_message) {
    StrictJsonParser parser(json, document, error_message, true, false);
    return parser.Parse();
}

std::optional<std::string> StrictJsonStringField(const StrictJsonObjectDocument& document,
                                                 const std::string& key) {
    const auto* member = document.Find(key);
    if (member == nullptr || member->type != StrictJsonType::String) return std::nullopt;
    return member->string_value;
}

std::optional<bool> StrictJsonBoolField(const StrictJsonObjectDocument& document,
                                        const std::string& key) {
    const auto* member = document.Find(key);
    if (member == nullptr || member->type != StrictJsonType::Bool) return std::nullopt;
    return member->bool_value;
}

std::optional<std::string> StrictJsonObjectField(const StrictJsonObjectDocument& document,
                                                 const std::string& key) {
    const auto* member = document.Find(key);
    if (member == nullptr || member->type != StrictJsonType::Object) return std::nullopt;
    return member->raw;
}

bool StrictJsonFieldIsNull(const StrictJsonObjectDocument& document, const std::string& key) {
    const auto* member = document.Find(key);
    return member != nullptr && member->type == StrictJsonType::Null;
}

bool StrictJsonHasTopLevelField(const StrictJsonObjectDocument& document, const std::string& key) {
    return document.Find(key) != nullptr;
}

bool StrictJsonContainsKey(const StrictJsonObjectDocument& document, const std::string& key) {
    return document.all_keys.find(key) != document.all_keys.end();
}

}  // namespace ingress
