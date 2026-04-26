// 파일 요약: 분석 detector 공통 인터페이스와 factory 함수를 선언한다.
// 동작 요약: dummy/YOLO detector가 같은 AnalyzeFrame 계약을 구현한다.
// 동작 요약: AnalysisProfile과 RawVideoFrame을 detector 구현으로 넘기는 경계를 정의한다.
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
