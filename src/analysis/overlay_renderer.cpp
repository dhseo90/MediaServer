// 파일 요약: raw RGB/BGR frame 위에 detection overlay를 직접 그린다.
// 동작 요약: 카테고리별 색상, 한글/영문 label, track id/trail, event blink highlight를 렌더링한다.
// 동작 요약: OpenCV 의존 없이 snapshot과 RTSP/WebRTC overlay 모두에서 재사용된다.
#include "analysis/overlay_renderer.h"

#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <cstdio>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

#if MEDIA_SERVER_USE_PANGOCAIRO
#include <cairo.h>
#include <pango/pangocairo.h>
#endif

namespace analysis {

namespace {

struct Color {
    unsigned char r;
    unsigned char g;
    unsigned char b;
};

struct PixelRect {
    int x1{0};
    int y1{0};
    int x2{0};
    int y2{0};
};

void SetError(std::string* error_message, std::string message) {
    if (error_message != nullptr) {
        *error_message = std::move(message);
    }
}

int ClampInt(int value, int min_value, int max_value) {
    return std::max(min_value, std::min(max_value, value));
}

OverlayLabelLanguage EffectiveLabelLanguage(OverlayLabelLanguage language) {
#if MEDIA_SERVER_USE_PANGOCAIRO
    return language;
#else
    // ASCII fallback cannot render Korean glyphs, so keep streams readable.
    return OverlayLabelLanguage::English;
#endif
}

int HexDigit(char ch) {
    if (ch >= '0' && ch <= '9') {
        return ch - '0';
    }
    if (ch >= 'a' && ch <= 'f') {
        return ch - 'a' + 10;
    }
    if (ch >= 'A' && ch <= 'F') {
        return ch - 'A' + 10;
    }
    return -1;
}

Color ParseHexColorOrDefault(const std::string& value, Color fallback) {
    if (value.size() != 7 || value[0] != '#') {
        return fallback;
    }
    std::array<int, 6> digits{};
    for (std::size_t i = 0; i < digits.size(); ++i) {
        digits[i] = HexDigit(value[i + 1]);
        if (digits[i] < 0) {
            return fallback;
        }
    }
    return Color{
        static_cast<unsigned char>(digits[0] * 16 + digits[1]),
        static_cast<unsigned char>(digits[2] * 16 + digits[3]),
        static_cast<unsigned char>(digits[4] * 16 + digits[5]),
    };
}

bool ShouldDrawEventBlink(const RawVideoFrame& frame, const Detection& detection) {
    const int duration_ms = ClampInt(detection.event_highlight_duration_ms, 100, 10000);
    const int period_ms = ClampInt(duration_ms / 3, 180, 700);
    const std::int64_t pts_ms = frame.pts > 0 ? frame.pts / 1000000LL : 0;
    return ((pts_ms / period_ms) % 2) == 0;
}

void PutPixel(RawVideoFrame* frame, int x, int y, Color color) {
    if (frame == nullptr || x < 0 || y < 0 || x >= frame->width || y >= frame->height) {
        return;
    }
    if (frame->format != PixelFormat::RGB && frame->format != PixelFormat::BGR) {
        return;
    }
    const std::size_t offset = static_cast<std::size_t>((y * frame->width + x) * 3);
    if (offset + 2 >= frame->data.size()) {
        return;
    }
    if (frame->format == PixelFormat::RGB) {
        frame->data[offset] = color.r;
        frame->data[offset + 1] = color.g;
        frame->data[offset + 2] = color.b;
    } else {
        frame->data[offset] = color.b;
        frame->data[offset + 1] = color.g;
        frame->data[offset + 2] = color.r;
    }
}

void BlendPixel(RawVideoFrame* frame, int x, int y, Color color, unsigned char alpha) {
    if (frame == nullptr || alpha == 0 || x < 0 || y < 0 || x >= frame->width || y >= frame->height) {
        return;
    }
    if (frame->format != PixelFormat::RGB && frame->format != PixelFormat::BGR) {
        return;
    }
    const std::size_t offset = static_cast<std::size_t>((y * frame->width + x) * 3);
    if (offset + 2 >= frame->data.size()) {
        return;
    }
    const auto blend = [alpha](unsigned char dst, unsigned char src) {
        const std::uint16_t inv = static_cast<std::uint16_t>(255 - alpha);
        return static_cast<unsigned char>((static_cast<std::uint16_t>(src) * alpha +
                                           static_cast<std::uint16_t>(dst) * inv) /
                                          255);
    };
    if (frame->format == PixelFormat::RGB) {
        frame->data[offset] = blend(frame->data[offset], color.r);
        frame->data[offset + 1] = blend(frame->data[offset + 1], color.g);
        frame->data[offset + 2] = blend(frame->data[offset + 2], color.b);
    } else {
        frame->data[offset] = blend(frame->data[offset], color.b);
        frame->data[offset + 1] = blend(frame->data[offset + 1], color.g);
        frame->data[offset + 2] = blend(frame->data[offset + 2], color.r);
    }
}

void FillRect(RawVideoFrame* frame, int x1, int y1, int x2, int y2, Color color) {
    if (frame == nullptr) {
        return;
    }
    x1 = ClampInt(x1, 0, frame->width - 1);
    x2 = ClampInt(x2, 0, frame->width - 1);
    y1 = ClampInt(y1, 0, frame->height - 1);
    y2 = ClampInt(y2, 0, frame->height - 1);
    if (x2 < x1 || y2 < y1) {
        return;
    }
    for (int y = y1; y <= y2; ++y) {
        for (int x = x1; x <= x2; ++x) {
            PutPixel(frame, x, y, color);
        }
    }
}

void DrawRect(RawVideoFrame* frame, int x1, int y1, int x2, int y2, int thickness, Color color) {
    if (frame == nullptr) {
        return;
    }
    thickness = ClampInt(thickness, 1, 16);
    for (int i = 0; i < thickness; ++i) {
        FillRect(frame, x1, y1 + i, x2, y1 + i, color);
        FillRect(frame, x1, y2 - i, x2, y2 - i, color);
        FillRect(frame, x1 + i, y1, x1 + i, y2, color);
        FillRect(frame, x2 - i, y1, x2 - i, y2, color);
    }
}

void DrawDisc(RawVideoFrame* frame, int cx, int cy, int radius, Color color, unsigned char alpha) {
    if (frame == nullptr) {
        return;
    }
    radius = ClampInt(radius, 1, 32);
    const int radius_sq = radius * radius;
    for (int y = cy - radius; y <= cy + radius; ++y) {
        for (int x = cx - radius; x <= cx + radius; ++x) {
            const int dx = x - cx;
            const int dy = y - cy;
            if (dx * dx + dy * dy <= radius_sq) {
                BlendPixel(frame, x, y, color, alpha);
            }
        }
    }
}

void DrawLine(RawVideoFrame* frame, int x1, int y1, int x2, int y2, int thickness, Color color, unsigned char alpha) {
    if (frame == nullptr) {
        return;
    }
    thickness = ClampInt(thickness, 1, 16);
    const int dx = x2 - x1;
    const int dy = y2 - y1;
    const int steps = std::max(std::abs(dx), std::abs(dy));
    if (steps == 0) {
        DrawDisc(frame, x1, y1, std::max(1, thickness / 2), color, alpha);
        return;
    }
    for (int i = 0; i <= steps; ++i) {
        const float t = static_cast<float>(i) / static_cast<float>(steps);
        const int x = static_cast<int>(std::lround(static_cast<float>(x1) + static_cast<float>(dx) * t));
        const int y = static_cast<int>(std::lround(static_cast<float>(y1) + static_cast<float>(dy) * t));
        DrawDisc(frame, x, y, std::max(1, thickness / 2), color, alpha);
    }
}

PixelRect MakePixelRect(int x, int y, int width, int height, int frame_width, int frame_height) {
    width = std::max(1, std::min(width, frame_width));
    height = std::max(1, std::min(height, frame_height));
    x = ClampInt(x, 0, std::max(0, frame_width - width));
    y = ClampInt(y, 0, std::max(0, frame_height - height));
    return PixelRect{x, y, x + width - 1, y + height - 1};
}

bool Intersects(const PixelRect& a, const PixelRect& b, int margin = 0) {
    return !(a.x2 + margin < b.x1 || b.x2 + margin < a.x1 || a.y2 + margin < b.y1 || b.y2 + margin < a.y1);
}

int IntersectionArea(const PixelRect& a, const PixelRect& b) {
    const int x1 = std::max(a.x1, b.x1);
    const int y1 = std::max(a.y1, b.y1);
    const int x2 = std::min(a.x2, b.x2);
    const int y2 = std::min(a.y2, b.y2);
    if (x2 < x1 || y2 < y1) {
        return 0;
    }
    return (x2 - x1 + 1) * (y2 - y1 + 1);
}

PixelRect PlaceLabelRect(const PixelRect& object_rect,
                         int label_width,
                         int label_height,
                         int frame_width,
                         int frame_height,
                         const std::vector<PixelRect>& placed_labels) {
    const int gap = 2;
    const std::array<PixelRect, 8> candidates{{
        MakePixelRect(object_rect.x1, object_rect.y1 - label_height - gap, label_width, label_height, frame_width, frame_height),
        MakePixelRect(object_rect.x1, object_rect.y1, label_width, label_height, frame_width, frame_height),
        MakePixelRect(object_rect.x1, object_rect.y2 + gap, label_width, label_height, frame_width, frame_height),
        MakePixelRect(object_rect.x2 - label_width + 1,
                      object_rect.y1 - label_height - gap,
                      label_width,
                      label_height,
                      frame_width,
                      frame_height),
        MakePixelRect(object_rect.x2 - label_width + 1, object_rect.y1, label_width, label_height, frame_width, frame_height),
        MakePixelRect(object_rect.x2 - label_width + 1,
                      object_rect.y2 + gap,
                      label_width,
                      label_height,
                      frame_width,
                      frame_height),
        MakePixelRect(object_rect.x2 + gap, object_rect.y1, label_width, label_height, frame_width, frame_height),
        MakePixelRect(object_rect.x1 - label_width - gap, object_rect.y1, label_width, label_height, frame_width, frame_height),
    }};

    PixelRect best = candidates.front();
    int best_penalty = std::numeric_limits<int>::max();
    for (const auto& candidate : candidates) {
        int penalty = 0;
        bool collides = false;
        for (const auto& placed : placed_labels) {
            if (Intersects(candidate, placed, 2)) {
                collides = true;
                penalty += IntersectionArea(candidate, placed);
            }
        }
        if (!collides) {
            return candidate;
        }
        if (penalty < best_penalty) {
            best_penalty = penalty;
            best = candidate;
        }
    }
    return best;
}

const std::array<const char*, 7>* GlyphFor(char raw_ch) {
    static const std::array<const char*, 7> space{{"00000", "00000", "00000", "00000", "00000", "00000", "00000"}};
    static const std::array<const char*, 7> unknown{{"11110", "00010", "00100", "01000", "01000", "00000", "01000"}};
    static const std::array<const char*, 7> dash{{"00000", "00000", "00000", "11110", "00000", "00000", "00000"}};
    static const std::array<const char*, 7> dot{{"00000", "00000", "00000", "00000", "00000", "01100", "01100"}};
    static const std::array<const char*, 7> colon{{"00000", "01100", "01100", "00000", "01100", "01100", "00000"}};
    static const std::array<const char*, 7> percent{{"11001", "11010", "00100", "01000", "10110", "00110", "00000"}};
    static const std::array<const char*, 7> slash{{"00001", "00010", "00100", "00100", "01000", "10000", "00000"}};
    static const std::array<const char*, 7> lparen{{"00110", "01000", "10000", "10000", "10000", "01000", "00110"}};
    static const std::array<const char*, 7> rparen{{"01100", "00010", "00001", "00001", "00001", "00010", "01100"}};

    static const std::array<std::array<const char*, 7>, 10> digits{{
        {"01110", "10001", "10011", "10101", "11001", "10001", "01110"},
        {"00100", "01100", "00100", "00100", "00100", "00100", "01110"},
        {"01110", "10001", "00001", "00010", "00100", "01000", "11111"},
        {"11110", "00001", "00001", "01110", "00001", "00001", "11110"},
        {"00010", "00110", "01010", "10010", "11111", "00010", "00010"},
        {"11111", "10000", "10000", "11110", "00001", "00001", "11110"},
        {"01110", "10000", "10000", "11110", "10001", "10001", "01110"},
        {"11111", "00001", "00010", "00100", "01000", "01000", "01000"},
        {"01110", "10001", "10001", "01110", "10001", "10001", "01110"},
        {"01110", "10001", "10001", "01111", "00001", "00001", "01110"},
    }};

    static const std::array<std::array<const char*, 7>, 26> letters{{
        {"01110", "10001", "10001", "11111", "10001", "10001", "10001"},
        {"11110", "10001", "10001", "11110", "10001", "10001", "11110"},
        {"01111", "10000", "10000", "10000", "10000", "10000", "01111"},
        {"11110", "10001", "10001", "10001", "10001", "10001", "11110"},
        {"11111", "10000", "10000", "11110", "10000", "10000", "11111"},
        {"11111", "10000", "10000", "11110", "10000", "10000", "10000"},
        {"01111", "10000", "10000", "10011", "10001", "10001", "01111"},
        {"10001", "10001", "10001", "11111", "10001", "10001", "10001"},
        {"01110", "00100", "00100", "00100", "00100", "00100", "01110"},
        {"00001", "00001", "00001", "00001", "10001", "10001", "01110"},
        {"10001", "10010", "10100", "11000", "10100", "10010", "10001"},
        {"10000", "10000", "10000", "10000", "10000", "10000", "11111"},
        {"10001", "11011", "10101", "10101", "10001", "10001", "10001"},
        {"10001", "11001", "10101", "10011", "10001", "10001", "10001"},
        {"01110", "10001", "10001", "10001", "10001", "10001", "01110"},
        {"11110", "10001", "10001", "11110", "10000", "10000", "10000"},
        {"01110", "10001", "10001", "10001", "10101", "10010", "01101"},
        {"11110", "10001", "10001", "11110", "10100", "10010", "10001"},
        {"01111", "10000", "10000", "01110", "00001", "00001", "11110"},
        {"11111", "00100", "00100", "00100", "00100", "00100", "00100"},
        {"10001", "10001", "10001", "10001", "10001", "10001", "01110"},
        {"10001", "10001", "10001", "10001", "10001", "01010", "00100"},
        {"10001", "10001", "10001", "10101", "10101", "11011", "10001"},
        {"10001", "10001", "01010", "00100", "01010", "10001", "10001"},
        {"10001", "10001", "01010", "00100", "00100", "00100", "00100"},
        {"11111", "00001", "00010", "00100", "01000", "10000", "11111"},
    }};

    const char ch = static_cast<char>(std::toupper(static_cast<unsigned char>(raw_ch)));
    if (ch == ' ') {
        return &space;
    }
    if (ch == '-') {
        return &dash;
    }
    if (ch == '.') {
        return &dot;
    }
    if (ch == ':') {
        return &colon;
    }
    if (ch == '%') {
        return &percent;
    }
    if (ch == '/') {
        return &slash;
    }
    if (ch == '(') {
        return &lparen;
    }
    if (ch == ')') {
        return &rparen;
    }
    if (ch >= '0' && ch <= '9') {
        return &digits[ch - '0'];
    }
    if (ch >= 'A' && ch <= 'Z') {
        return &letters[ch - 'A'];
    }
    return &unknown;
}

std::string NormalizeLabel(std::string label) {
    std::replace(label.begin(), label.end(), '_', ' ');
    std::transform(label.begin(), label.end(), label.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    return label;
}

std::string SentenceCase(std::string value) {
    if (value.empty()) {
        return value;
    }
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    value[0] = static_cast<char>(std::toupper(static_cast<unsigned char>(value[0])));
    return value;
}

struct LabelNames {
    std::string ko_category;
    std::string ko_object;
    std::string en_category;
    std::string en_object;
    enum class Category {
        Unknown,
        Person,
        Vehicle,
        Sign,
        Animal,
        Sport,
        Food,
        Furniture,
        Device,
        Tableware,
        Goods,
    } category{Category::Unknown};
    bool grouped{true};
};

Color ColorForCategory(LabelNames::Category category) {
    // 일반 분석은 UI의 상위 객체 카테고리 기준으로 색상을 고정한다.
    // 빨간색 계열은 이후 이벤트/위험 강조용으로 남겨둔다.
    switch (category) {
        case LabelNames::Category::Person:     // 사람
            return Color{0, 114, 178};
        case LabelNames::Category::Vehicle:    // 차량
            return Color{0, 158, 115};
        case LabelNames::Category::Sign:       // 도로
            return Color{240, 228, 66};
        case LabelNames::Category::Animal:     // 동물
            return Color{106, 61, 154};
        case LabelNames::Category::Sport:      // 운동
            return Color{0, 191, 196};
        case LabelNames::Category::Food:       // 음식
            return Color{230, 159, 0};
        case LabelNames::Category::Furniture:  // 가구
            return Color{139, 90, 43};
        case LabelNames::Category::Device:     // 기기
            return Color{194, 24, 91};
        case LabelNames::Category::Tableware:  // 식기
            return Color{86, 180, 233};
        case LabelNames::Category::Goods:      // 잡화
            return Color{122, 134, 154};
        case LabelNames::Category::Unknown:
        default:
            return Color{216, 224, 232};
    }
}

Color TextColorForBackground(Color background) {
    const int luminance = static_cast<int>(0.299 * background.r + 0.587 * background.g + 0.114 * background.b);
    return luminance < 135 ? Color{255, 255, 255} : Color{0, 0, 0};
}

LabelNames NamesForLabel(const std::string& label) {
    const auto grouped = [&label](std::string ko_category,
                                  std::string ko_object,
                                  std::string en_category,
                                  LabelNames::Category category) {
        return LabelNames{
            std::move(ko_category), std::move(ko_object), std::move(en_category), label, category, true};
    };

    using Category = LabelNames::Category;
    if (label == "person") return LabelNames{"", "사람", "", "Person", Category::Person, false};
    if (label == "bicycle") return grouped("차량", "자전거", "Vehicle", Category::Vehicle);
    if (label == "car") return grouped("차량", "자동차", "Vehicle", Category::Vehicle);
    if (label == "motorcycle") return grouped("차량", "오토바이", "Vehicle", Category::Vehicle);
    if (label == "airplane") return grouped("차량", "비행기", "Vehicle", Category::Vehicle);
    if (label == "bus") return grouped("차량", "버스", "Vehicle", Category::Vehicle);
    if (label == "train") return grouped("차량", "기차", "Vehicle", Category::Vehicle);
    if (label == "truck") return grouped("차량", "트럭", "Vehicle", Category::Vehicle);
    if (label == "boat") return grouped("차량", "보트", "Vehicle", Category::Vehicle);
    if (label == "traffic light") return grouped("도로", "신호등", "Road", Category::Sign);
    if (label == "fire hydrant") return grouped("도로", "소화전", "Road", Category::Sign);
    if (label == "stop sign") return grouped("도로", "정지 표지판", "Road", Category::Sign);
    if (label == "parking meter") return grouped("도로", "주차 미터기", "Road", Category::Sign);
    if (label == "bird") return grouped("동물", "새", "Animal", Category::Animal);
    if (label == "cat") return grouped("동물", "고양이", "Animal", Category::Animal);
    if (label == "dog") return grouped("동물", "강아지", "Animal", Category::Animal);
    if (label == "horse") return grouped("동물", "말", "Animal", Category::Animal);
    if (label == "sheep") return grouped("동물", "양", "Animal", Category::Animal);
    if (label == "cow") return grouped("동물", "소", "Animal", Category::Animal);
    if (label == "elephant") return grouped("동물", "코끼리", "Animal", Category::Animal);
    if (label == "bear") return grouped("동물", "곰", "Animal", Category::Animal);
    if (label == "zebra") return grouped("동물", "얼룩말", "Animal", Category::Animal);
    if (label == "giraffe") return grouped("동물", "기린", "Animal", Category::Animal);
    if (label == "backpack") return grouped("잡화", "백팩", "Goods", Category::Goods);
    if (label == "umbrella") return grouped("잡화", "우산", "Goods", Category::Goods);
    if (label == "handbag") return grouped("잡화", "핸드백", "Goods", Category::Goods);
    if (label == "tie") return grouped("잡화", "넥타이", "Goods", Category::Goods);
    if (label == "suitcase") return grouped("잡화", "여행가방", "Goods", Category::Goods);
    if (label == "frisbee") return grouped("운동", "프리스비", "Sport", Category::Sport);
    if (label == "skis") return grouped("운동", "스키", "Sport", Category::Sport);
    if (label == "snowboard") return grouped("운동", "스노보드", "Sport", Category::Sport);
    if (label == "sports ball") return LabelNames{"운동", "공", "Sport", "ball", Category::Sport, true};
    if (label == "kite") return grouped("운동", "연", "Sport", Category::Sport);
    if (label == "baseball bat") return grouped("운동", "야구 배트", "Sport", Category::Sport);
    if (label == "baseball glove") return grouped("운동", "야구 글러브", "Sport", Category::Sport);
    if (label == "skateboard") return grouped("운동", "스케이트보드", "Sport", Category::Sport);
    if (label == "surfboard") return grouped("운동", "서프보드", "Sport", Category::Sport);
    if (label == "tennis racket") return grouped("운동", "테니스 라켓", "Sport", Category::Sport);
    if (label == "bottle") return grouped("식기", "병", "Tableware", Category::Tableware);
    if (label == "wine glass") return grouped("식기", "와인잔", "Tableware", Category::Tableware);
    if (label == "cup") return grouped("식기", "컵", "Tableware", Category::Tableware);
    if (label == "fork") return grouped("식기", "포크", "Tableware", Category::Tableware);
    if (label == "knife") return grouped("식기", "칼", "Tableware", Category::Tableware);
    if (label == "spoon") return grouped("식기", "숟가락", "Tableware", Category::Tableware);
    if (label == "bowl") return grouped("식기", "그릇", "Tableware", Category::Tableware);
    if (label == "banana") return grouped("음식", "바나나", "Food", Category::Food);
    if (label == "apple") return grouped("음식", "사과", "Food", Category::Food);
    if (label == "sandwich") return grouped("음식", "샌드위치", "Food", Category::Food);
    if (label == "orange") return grouped("음식", "오렌지", "Food", Category::Food);
    if (label == "broccoli") return grouped("음식", "브로콜리", "Food", Category::Food);
    if (label == "carrot") return grouped("음식", "당근", "Food", Category::Food);
    if (label == "hot dog") return grouped("음식", "핫도그", "Food", Category::Food);
    if (label == "pizza") return grouped("음식", "피자", "Food", Category::Food);
    if (label == "donut") return grouped("음식", "도넛", "Food", Category::Food);
    if (label == "cake") return grouped("음식", "케이크", "Food", Category::Food);
    if (label == "bench") return grouped("가구", "벤치", "Furniture", Category::Furniture);
    if (label == "chair") return grouped("가구", "의자", "Furniture", Category::Furniture);
    if (label == "couch") return grouped("가구", "소파", "Furniture", Category::Furniture);
    if (label == "potted plant") return grouped("가구", "화분", "Furniture", Category::Furniture);
    if (label == "bed") return grouped("가구", "침대", "Furniture", Category::Furniture);
    if (label == "dining table") return grouped("가구", "식탁", "Furniture", Category::Furniture);
    if (label == "toilet") return grouped("가구", "변기", "Furniture", Category::Furniture);
    if (label == "tv") return grouped("기기", "TV", "Device", Category::Device);
    if (label == "laptop") return grouped("기기", "노트북", "Device", Category::Device);
    if (label == "mouse") return grouped("기기", "마우스", "Device", Category::Device);
    if (label == "remote") return grouped("기기", "리모컨", "Device", Category::Device);
    if (label == "keyboard") return grouped("기기", "키보드", "Device", Category::Device);
    if (label == "cell phone") return grouped("기기", "휴대폰", "Device", Category::Device);
    if (label == "microwave") return grouped("기기", "전자레인지", "Device", Category::Device);
    if (label == "oven") return grouped("기기", "오븐", "Device", Category::Device);
    if (label == "toaster") return grouped("기기", "토스터", "Device", Category::Device);
    if (label == "sink") return grouped("가구", "싱크대", "Furniture", Category::Furniture);
    if (label == "refrigerator") return grouped("기기", "냉장고", "Device", Category::Device);
    if (label == "book") return grouped("잡화", "책", "Goods", Category::Goods);
    if (label == "clock") return grouped("기기", "시계", "Device", Category::Device);
    if (label == "vase") return grouped("잡화", "꽃병", "Goods", Category::Goods);
    if (label == "scissors") return grouped("잡화", "가위", "Goods", Category::Goods);
    if (label == "teddy bear") return grouped("잡화", "곰인형", "Goods", Category::Goods);
    if (label == "hair drier") return grouped("기기", "헤어드라이어", "Device", Category::Device);
    if (label == "toothbrush") return grouped("잡화", "칫솔", "Goods", Category::Goods);
    return LabelNames{"", label, "", SentenceCase(label), Category::Unknown, false};
}

std::string FormatLabelNames(const LabelNames& names, OverlayLabelLanguage language) {
    if (EffectiveLabelLanguage(language) == OverlayLabelLanguage::Korean) {
        return names.grouped ? (names.ko_category + "(" + names.ko_object + ")") : names.ko_object;
    }
    return names.grouped ? (names.en_category + "(" + names.en_object + ")") : names.en_object;
}

LabelNames NamesForDetection(const Detection& detection) {
    const std::string label =
        NormalizeLabel(detection.label.empty() ? ("class_" + std::to_string(detection.class_id)) : detection.label);
    return NamesForLabel(label);
}

std::string GroupedOverlayLabel(const Detection& detection, OverlayLabelLanguage language) {
    return FormatLabelNames(NamesForDetection(detection), language);
}

Color ColorForDetection(const Detection& detection) {
    return ColorForCategory(NamesForDetection(detection).category);
}

void DrawTrackTrail(RawVideoFrame* output, const Track& track, int frame_width, int frame_height, int thickness) {
    if (output == nullptr || track.trail.size() < 2) {
        return;
    }
    const Color color = ColorForDetection(track.detection);
    const int line_thickness = ClampInt(std::max(1, thickness - 1), 1, 12);
    for (std::size_t i = 1; i < track.trail.size(); ++i) {
        const auto& previous = track.trail[i - 1];
        const auto& current = track.trail[i];
        const int x1 = ClampInt(static_cast<int>(std::lround(previous.x * frame_width)), 0, frame_width - 1);
        const int y1 = ClampInt(static_cast<int>(std::lround(previous.y * frame_height)), 0, frame_height - 1);
        const int x2 = ClampInt(static_cast<int>(std::lround(current.x * frame_width)), 0, frame_width - 1);
        const int y2 = ClampInt(static_cast<int>(std::lround(current.y * frame_height)), 0, frame_height - 1);
        const unsigned char alpha =
            static_cast<unsigned char>(80 + (120 * static_cast<int>(i)) / static_cast<int>(track.trail.size()));
        DrawLine(output, x1, y1, x2, y2, line_thickness, color, alpha);
    }

    const auto& last = track.trail.back();
    const int x = ClampInt(static_cast<int>(std::lround(last.x * frame_width)), 0, frame_width - 1);
    const int y = ClampInt(static_cast<int>(std::lround(last.y * frame_height)), 0, frame_height - 1);
    DrawDisc(output, x, y, ClampInt(thickness + 1, 2, 16), color, 230);
}

void DrawText(RawVideoFrame* frame, int x, int y, const std::string& text, Color color, int scale) {
    if (frame == nullptr || scale <= 0) {
        return;
    }
    int cursor_x = x;
    for (const char ch : text) {
        const auto* glyph = GlyphFor(ch);
        for (int gy = 0; gy < 7; ++gy) {
            for (int gx = 0; gx < 5; ++gx) {
                if ((*glyph)[gy][gx] != '1') {
                    continue;
                }
                FillRect(frame,
                         cursor_x + gx * scale,
                         y + gy * scale,
                         cursor_x + (gx + 1) * scale - 1,
                         y + (gy + 1) * scale - 1,
                         color);
            }
        }
        cursor_x += 6 * scale;
        if (cursor_x >= frame->width) {
            break;
        }
    }
}

struct TextSize {
    int width{0};
    int height{0};
};

#if MEDIA_SERVER_USE_PANGOCAIRO
PangoFontDescription* CreateOverlayFont(int frame_width) {
    const int font_px = frame_width >= 1280 ? 14 : (frame_width >= 720 ? 12 : 10);
    PangoFontDescription* desc = pango_font_description_from_string("Sans Bold");
    pango_font_description_set_absolute_size(desc, font_px * PANGO_SCALE);
    return desc;
}

TextSize MeasurePangoText(const std::string& text, int frame_width) {
    cairo_surface_t* surface = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, 8, 8);
    cairo_t* cr = cairo_create(surface);
    PangoLayout* layout = pango_cairo_create_layout(cr);
    PangoFontDescription* font = CreateOverlayFont(frame_width);
    pango_layout_set_font_description(layout, font);
    pango_layout_set_text(layout, text.c_str(), -1);
    TextSize size;
    pango_layout_get_pixel_size(layout, &size.width, &size.height);
    pango_font_description_free(font);
    g_object_unref(layout);
    cairo_destroy(cr);
    cairo_surface_destroy(surface);
    return size;
}

void DrawPangoText(RawVideoFrame* frame, int x, int y, const std::string& text, Color color) {
    if (frame == nullptr || text.empty()) {
        return;
    }
    const TextSize measured = MeasurePangoText(text, frame->width);
    const int width = std::max(1, measured.width + 2);
    const int height = std::max(1, measured.height + 2);
    cairo_surface_t* surface = cairo_image_surface_create(CAIRO_FORMAT_ARGB32, width, height);
    cairo_t* cr = cairo_create(surface);
    cairo_set_operator(cr, CAIRO_OPERATOR_CLEAR);
    cairo_paint(cr);
    cairo_set_operator(cr, CAIRO_OPERATOR_OVER);
    cairo_set_source_rgba(cr, color.r / 255.0, color.g / 255.0, color.b / 255.0, 1.0);

    PangoLayout* layout = pango_cairo_create_layout(cr);
    PangoFontDescription* font = CreateOverlayFont(frame->width);
    pango_layout_set_font_description(layout, font);
    pango_layout_set_text(layout, text.c_str(), -1);
    pango_cairo_show_layout(cr, layout);
    cairo_surface_flush(surface);

    unsigned char* data = cairo_image_surface_get_data(surface);
    const int stride = cairo_image_surface_get_stride(surface);
    for (int yy = 0; yy < height; ++yy) {
        const unsigned char* row = data + yy * stride;
        for (int xx = 0; xx < width; ++xx) {
            const unsigned char b = row[xx * 4 + 0];
            const unsigned char g = row[xx * 4 + 1];
            const unsigned char r = row[xx * 4 + 2];
            const unsigned char a = row[xx * 4 + 3];
            if (a == 0) {
                continue;
            }
            const auto unpremultiply = [a](unsigned char channel) {
                if (a == 255) {
                    return channel;
                }
                return static_cast<unsigned char>(std::min(255, (static_cast<int>(channel) * 255) / a));
            };
            BlendPixel(frame, x + xx, y + yy, Color{unpremultiply(r), unpremultiply(g), unpremultiply(b)}, a);
        }
    }

    pango_font_description_free(font);
    g_object_unref(layout);
    cairo_destroy(cr);
    cairo_surface_destroy(surface);
}
#endif

TextSize MeasureOverlayText(const RawVideoFrame& frame, const std::string& text, int scale) {
#if MEDIA_SERVER_USE_PANGOCAIRO
    return MeasurePangoText(text, frame.width);
#else
    return TextSize{static_cast<int>(text.size()) * 6 * scale, 7 * scale};
#endif
}

void DrawOverlayText(RawVideoFrame* frame, int x, int y, const std::string& text, Color color, int scale) {
#if MEDIA_SERVER_USE_PANGOCAIRO
    DrawPangoText(frame, x, y, text, color);
#else
    DrawText(frame, x, y, text, color, scale);
#endif
}

std::string BuildLabel(const Detection& detection, OverlayLabelLanguage language, bool draw_track_ids) {
    char score[16];
    const int percent = ClampInt(static_cast<int>(std::lround(detection.score * 100.0F)), 0, 100);
    std::snprintf(score, sizeof(score), "%d%%", percent);
    std::string label = GroupedOverlayLabel(detection, language);
    if (draw_track_ids && detection.track_id > 0) {
        label += " #" + std::to_string(detection.track_id);
    }
    if (detection.event_triggered) {
        label = EffectiveLabelLanguage(language) == OverlayLabelLanguage::Korean ? ("이벤트 " + label)
                                                                                : ("Event " + label);
    }
    return label + " " + score;
}

}  // namespace

bool RenderDetectionOverlay(const RawVideoFrame& frame,
                            const AnalysisResult& result,
                            const OverlayRenderOptions& options,
                            RawVideoFrame* output,
                            std::string* error_message) {
    if (output == nullptr) {
        SetError(error_message, "missing overlay output frame");
        return false;
    }
    if (frame.width <= 0 || frame.height <= 0 || frame.data.empty()) {
        SetError(error_message, "missing raw frame data for overlay");
        return false;
    }
    if (frame.format != PixelFormat::RGB && frame.format != PixelFormat::BGR) {
        SetError(error_message, "overlay renderer requires RGB or BGR raw frame");
        return false;
    }

    *output = frame;
    const int thickness = ClampInt(options.line_thickness, 1, 16);
    const int text_scale = frame.width >= 1280 ? 2 : 1;
    const int label_padding = frame.width >= 1280 ? 2 : 1;

    struct LabelDrawItem {
        PixelRect rect;
        std::string text;
        Color color;
        Color text_color;
        bool event_priority{false};
    };
    std::vector<LabelDrawItem> labels;
    std::vector<PixelRect> placed_label_rects;
    labels.reserve(result.detections.size());
    placed_label_rects.reserve(result.detections.size());

    if (options.draw_track_trails) {
        for (const auto& track : result.tracks) {
            DrawTrackTrail(output, track, frame.width, frame.height, thickness);
        }
    }

    // Box를 먼저 모두 그리고 label은 마지막에 그려야 다른 객체 box가 label을 덮지 않는다.
    for (const auto& detection : result.detections) {
        const int x1 = ClampInt(static_cast<int>(std::lround(detection.box.x * frame.width)), 0, frame.width - 1);
        const int y1 = ClampInt(static_cast<int>(std::lround(detection.box.y * frame.height)), 0, frame.height - 1);
        const int x2 = ClampInt(static_cast<int>(std::lround((detection.box.x + detection.box.width) * frame.width)),
                                0,
                                frame.width - 1);
        const int y2 = ClampInt(static_cast<int>(std::lround((detection.box.y + detection.box.height) * frame.height)),
                                0,
                                frame.height - 1);
        if (x2 <= x1 || y2 <= y1) {
            continue;
        }

        const bool event_on =
            options.draw_event_highlight && detection.event_triggered && ShouldDrawEventBlink(frame, detection);
        const Color normal_color = ColorForDetection(detection);
        const Color box_color = event_on
                                    ? ParseHexColorOrDefault(detection.event_highlight_color, Color{255, 0, 0})
                                    : normal_color;
        const int box_thickness = event_on ? ClampInt(thickness + 3, 1, 16) : thickness;
        DrawRect(output, x1, y1, x2, y2, box_thickness, box_color);

    }

    if (options.draw_labels) {
        std::vector<std::size_t> label_indices;
        label_indices.reserve(result.detections.size());
        for (std::size_t index = 0; index < result.detections.size(); ++index) {
            label_indices.push_back(index);
        }
        std::stable_sort(label_indices.begin(), label_indices.end(), [&result](std::size_t lhs, std::size_t rhs) {
            const auto& left = result.detections[lhs];
            const auto& right = result.detections[rhs];
            if (left.event_triggered != right.event_triggered) {
                return left.event_triggered && !right.event_triggered;
            }
            return left.score > right.score;
        });

        // 이벤트 label은 먼저 자리를 잡아 일반 객체 label에 밀리지 않게 하고, 실제 출력은 마지막에 그린다.
        for (const std::size_t index : label_indices) {
            const auto& detection = result.detections[index];
            const int x1 = ClampInt(static_cast<int>(std::lround(detection.box.x * frame.width)), 0, frame.width - 1);
            const int y1 = ClampInt(static_cast<int>(std::lround(detection.box.y * frame.height)), 0, frame.height - 1);
            const int x2 =
                ClampInt(static_cast<int>(std::lround((detection.box.x + detection.box.width) * frame.width)),
                         0,
                         frame.width - 1);
            const int y2 =
                ClampInt(static_cast<int>(std::lround((detection.box.y + detection.box.height) * frame.height)),
                         0,
                         frame.height - 1);
            if (x2 <= x1 || y2 <= y1) {
                continue;
            }

            const bool event_on =
                options.draw_event_highlight && detection.event_triggered && ShouldDrawEventBlink(frame, detection);
            const Color normal_color = ColorForDetection(detection);
            const Color label_color = event_on
                                          ? ParseHexColorOrDefault(detection.event_highlight_color, Color{255, 0, 0})
                                          : normal_color;
            const std::string label = BuildLabel(detection, options.label_language, options.draw_track_ids);
            const TextSize text_size = MeasureOverlayText(frame, label, text_scale);
            const int label_width = std::min(frame.width, text_size.width + label_padding * 2);
            const int label_height = text_size.height + label_padding * 2;
            const PixelRect object_rect{x1, y1, x2, y2};
            const PixelRect label_rect =
                PlaceLabelRect(object_rect, label_width, label_height, frame.width, frame.height, placed_label_rects);
            placed_label_rects.push_back(label_rect);
            labels.push_back(
                LabelDrawItem{label_rect, label, label_color, TextColorForBackground(label_color), detection.event_triggered});
        }

        std::stable_sort(labels.begin(), labels.end(), [](const LabelDrawItem& lhs, const LabelDrawItem& rhs) {
            return !lhs.event_priority && rhs.event_priority;
        });
    }

    for (const auto& label : labels) {
        FillRect(output, label.rect.x1, label.rect.y1, label.rect.x2, label.rect.y2, label.color);
        DrawOverlayText(output,
                        label.rect.x1 + label_padding,
                        label.rect.y1 + label_padding,
                        label.text,
                        label.text_color,
                        text_scale);
    }

    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

}  // namespace analysis
