// 파일 요약: transport와 application service가 공유하는 dependency-free 응답 값을 선언한다.
// 동작 요약: 기존 registry 응답의 status/status_text/body를 의미 변경 없이 전달한다.
#pragma once

#include <string>
#include "recording/recording_memory_reservation.h"

namespace ingress {

struct ApplicationServiceResult {
    recording::SearchModelResidency::Reservation memory;
    int status{200};
    std::string status_text{"OK"};
    std::string body;
    ApplicationServiceResult()=default;
    ApplicationServiceResult(int code,std::string text,std::string payload,
        recording::SearchModelResidency::Reservation charge={}):memory(std::move(charge)),status(code),status_text(std::move(text)),body(std::move(payload)){}
    ApplicationServiceResult(const ApplicationServiceResult&)=default;
    ApplicationServiceResult(ApplicationServiceResult&&) noexcept=default;
    ApplicationServiceResult& operator=(ApplicationServiceResult other) noexcept {
        memory.swap(other.memory);std::swap(status,other.status);status_text.swap(other.status_text);body.swap(other.body);return *this;
    }
};

}  // namespace ingress
