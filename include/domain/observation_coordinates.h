// 파일 용도: 지원 producer가 실제 실행 시 고정한 좌표 출처. 과거 값에 기본 출처를 부여하지 않는다.
#pragma once
#include <string>

namespace analysis {
struct ObservationCoordinatesV1 {
    std::string schema{"media-server.observation-coordinates.v1"};
    std::string producer, value_kind, units, frame_mapping, policy;
    int frame_width{}, frame_height{}, input_width{}, input_height{};
    int resized_width{}, resized_height{};
    double scale_x{}, scale_y{}, pad_x{}, pad_y{};
    std::string resize;
};
bool ValidateObservationCoordinates(const ObservationCoordinatesV1&);
std::string SerializeObservationCoordinates(const ObservationCoordinatesV1&);
bool ParseObservationCoordinates(const std::string&, ObservationCoordinatesV1*);
} // namespace analysis
