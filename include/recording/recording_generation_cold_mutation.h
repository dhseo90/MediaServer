#pragma once
#include "recording/recording_identity_shard.h"

namespace recording {
// caller는 검증된 현재 manifest/identity chain과 managed 독점 lease를 호출 동안 유지한다.
// 공개 DTO 자체는 신뢰 토큰이 아니다. evidence-<gen>-<slot> 또는 현재보다 오래된 봉인
// active-<gen>만 허용한다. 현재/미래 active와 snapshot/identity 파일은 대상이 아니다.
// 사용할 때 archive 전체 SHA를 64KiB 블록으로 확인하므로 IO 비용은 파일 전체 크기다.
// 메모리는 지정 물리 구간+고정 블록+파싱 결과에 비례한다. byte_admission은 물리 구간
// bytes 상한이지 RSS 상한이 아니다. 압축 해제는 기존 Journal의 16MiB 논리 상한을 따른다.
// 물리 canonical/LF 포함 raw SHA와 논리 EnvelopeIdentity를 분리하여 검사한다.
// Receipt의 identity는 originalSha256이다. 반환 physical_json은 압축 원문을 보존한다.
// domain 참조/상태 전이, 전체 chain 재검증, 제품 Open/Append/Checkpoint는 수행하지 않는다.
// 실패 시 output 불변. crypto-off는 지원하지 않으며 파일을 읽거나 바꾸지 않는다.
bool ReadVerifiedRecordingIdentityMutation(const std::filesystem::path& root,
    const RecordingGenerationManifest& current_manifest,
    const RecordingIdentityFirstAcceptance& acceptance, std::uint64_t byte_admission,
    RecordingMutationV1* output, std::string* error);
} // namespace recording
