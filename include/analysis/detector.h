// 파일 용도: YOLO/ONNX 같은 실제 detector를 교체 가능하게 만드는 분석 엔진 인터페이스를 선언한다.
#pragma once

#include "analysis/analysis_types.h"

namespace analysis {

class Detector {
public:
    virtual ~Detector() = default;

    virtual std::string Name() const = 0;
    virtual bool Start(std::string* error_message);
    virtual void Stop();
    virtual bool UpdateProfile(const AnalysisProfile& profile, std::string* error_message);
    virtual bool Analyze(const RawVideoFrame& frame, AnalysisResult* result, std::string* error_message) = 0;
};

std::unique_ptr<Detector> CreateDummyDetector();
std::unique_ptr<Detector> CreateYoloOnnxDetector(AnalysisProfile profile);
std::unique_ptr<Detector> CreateDetector(AnalysisProfile profile);

}  // namespace analysis
