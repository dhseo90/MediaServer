// 파일 요약: AnalysisProfile에 맞는 detector 인스턴스를 생성한다.
// 동작 요약: dummy detector와 YOLO/ONNX detector 선택을 한 곳에 모은다.
// 동작 요약: 상위 AnalysisManager가 detector 구현 세부사항을 몰라도 되게 한다.
#include "analysis/detector.h"

namespace analysis {

namespace {

class UnsupportedDetector final : public Detector {
public:
    explicit UnsupportedDetector(std::string message) : message_(std::move(message)) {}

    std::string Name() const override {
        return "unsupported";
    }

    bool Start(std::string* error_message) override {
        if (error_message != nullptr) {
            *error_message = message_;
        }
        return false;
    }

    bool Analyze(const RawVideoFrame& /*frame*/,
                 AnalysisResult* /*result*/,
                 std::string* error_message) override {
        if (error_message != nullptr) {
            *error_message = message_;
        }
        return false;
    }

private:
    std::string message_;
};

}  // namespace

std::unique_ptr<Detector> CreateDetector(AnalysisProfile profile) {
    if (profile.detector_type.empty() || profile.detector_type == "dummy") {
        return CreateDummyDetector();
    }
    if (profile.detector_type == "yolo" || profile.detector_type == "onnx-yolo") {
        return CreateYoloOnnxDetector(std::move(profile));
    }
    return std::make_unique<UnsupportedDetector>("unsupported detector type: " + profile.detector_type);
}

}  // namespace analysis
