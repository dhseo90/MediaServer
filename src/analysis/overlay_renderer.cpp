// 파일 용도: OpenCV 없이 raw RGB/BGR frame에 detection box와 label overlay를 그린다.
#include "analysis/overlay_renderer.h"

#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <cstdio>

namespace analysis {

namespace {

struct Color {
    unsigned char r;
    unsigned char g;
    unsigned char b;
};

constexpr std::array<Color, 10> kPalette{{
    {255, 80, 64},
    {64, 200, 255},
    {128, 255, 96},
    {255, 192, 64},
    {192, 128, 255},
    {255, 96, 192},
    {96, 255, 200},
    {255, 255, 96},
    {96, 160, 255},
    {224, 224, 224},
}};

void SetError(std::string* error_message, std::string message) {
    if (error_message != nullptr) {
        *error_message = std::move(message);
    }
}

int ClampInt(int value, int min_value, int max_value) {
    return std::max(min_value, std::min(max_value, value));
}

Color ColorForClass(int class_id) {
    const std::size_t index = static_cast<std::size_t>(std::abs(class_id)) % kPalette.size();
    return kPalette[index];
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

const std::array<const char*, 7>* GlyphFor(char raw_ch) {
    static const std::array<const char*, 7> space{{"00000", "00000", "00000", "00000", "00000", "00000", "00000"}};
    static const std::array<const char*, 7> unknown{{"11110", "00010", "00100", "01000", "01000", "00000", "01000"}};
    static const std::array<const char*, 7> dash{{"00000", "00000", "00000", "11110", "00000", "00000", "00000"}};
    static const std::array<const char*, 7> dot{{"00000", "00000", "00000", "00000", "00000", "01100", "01100"}};
    static const std::array<const char*, 7> colon{{"00000", "01100", "01100", "00000", "01100", "01100", "00000"}};

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
    if (ch >= '0' && ch <= '9') {
        return &digits[ch - '0'];
    }
    if (ch >= 'A' && ch <= 'Z') {
        return &letters[ch - 'A'];
    }
    return &unknown;
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

std::string BuildLabel(const Detection& detection) {
    char score[16];
    std::snprintf(score, sizeof(score), "%.2f", detection.score);
    std::string label = detection.label.empty() ? ("class_" + std::to_string(detection.class_id)) : detection.label;
    std::replace(label.begin(), label.end(), '_', ' ');
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
    const int text_height = 7 * text_scale;
    const int label_padding = 3;

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

        const Color box_color = ColorForClass(detection.class_id);
        DrawRect(output, x1, y1, x2, y2, thickness, box_color);

        if (!options.draw_labels) {
            continue;
        }
        const std::string label = BuildLabel(detection);
        const int label_width = std::min(frame.width - x1, static_cast<int>(label.size()) * 6 * text_scale + label_padding * 2);
        const int label_height = text_height + label_padding * 2;
        const int label_y1 = y1 >= label_height ? y1 - label_height : y1;
        const int label_y2 = std::min(frame.height - 1, label_y1 + label_height);
        FillRect(output, x1, label_y1, x1 + label_width, label_y2, box_color);
        DrawText(output, x1 + label_padding, label_y1 + label_padding, label, Color{0, 0, 0}, text_scale);
    }

    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

}  // namespace analysis
