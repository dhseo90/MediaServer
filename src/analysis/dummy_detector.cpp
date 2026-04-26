// 파일 요약: 실제 YOLO 없이 분석 pipeline을 검증하는 dummy detector 구현이다.
// 동작 요약: 입력 frame 크기와 시간 정보를 바탕으로 deterministic detection을 생성한다.
// 동작 요약: 디코딩, sampling, overlay, rule/event 흐름을 빠르게 smoke test할 때 사용한다.
#include "analysis/detector.h"

namespace analysis {

bool Detector::Start(std::string* error_message) {
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

void Detector::Stop() {}

bool Detector::UpdateProfile(const AnalysisProfile& /*profile*/, std::string* error_message) {
    if (error_message != nullptr) {
        error_message->clear();
    }
    return true;
}

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
