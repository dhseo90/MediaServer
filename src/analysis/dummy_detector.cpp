// 파일 용도: 실제 YOLO/ONNX 연동 전 분석 파이프라인 수명과 결과 전달을 검증하는 dummy detector를 구현한다.
#include "analysis/detector.h"

namespace analysis {

bool Detector::Start(std::string* error_message) {
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

void Detector::Stop() {}

namespace {

class DummyDetector final : public Detector {
public:
    std::string Name() const override {
        return "dummy";
    }

    bool Analyze(const RawVideoFrame& frame, AnalysisResult* result, std::string* error_message) override {
        if (result == nullptr) {
            if (error_message != nullptr) {
                *error_message = "missing analysis result output";
            }
            return false;
        }

        result->source_key = frame.source_key;
        result->pts = frame.pts;
        // 현재는 검출 결과를 만들지 않는다. decode hub/YOLO를 붙인 뒤 detections를 채운다.
        if (error_message != nullptr) {
            error_message->clear();
        }
        return true;
    }
};

}  // namespace

std::unique_ptr<Detector> CreateDummyDetector() {
    return std::make_unique<DummyDetector>();
}

}  // namespace analysis
