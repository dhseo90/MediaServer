// 파일 용도: VLM incident-to-rule provenance JSON과 실제 server record의 결속을 검증한다.
// 동작 요약: transport/API 타입 없이 strict JSON, manual-save, privacy, restart readback 계약을 판정한다.
#pragma once

#include <string>

namespace ingress {

bool ValidateVlmIncidentRuleProvenanceContract(const std::string& body,
                                               const std::string& rule_id,
                                               std::string* error_message);

}  // namespace ingress
