#pragma once
#include "recording/recording_generation_manifest.h"
#include "recording/recording_journal.h"
#include "recording/recording_order_history_snapshot.h"
#include <functional>
#include <optional>

namespace recording {
struct RecordingIdentityRow {
    std::string mutation_id;
    RecordingMutationType type{RecordingMutationType::Unknown};
    std::string entity_id;
    std::int64_t occurred_at_ms{0};
    std::uint64_t global_ordinal{0};
    // EnvelopeIdentity digest다. Receipt에는 originalSha256을 저장한다.
    std::string identity;
    std::uint64_t archive_slot{0}, offset{0}, length{0};
    std::string raw_sha256;
    std::optional<RecordingOrderReservationV1> reservation;
};
struct RecordingIdentityShard {
    std::string store_id;
    std::uint64_t generation{0};
    std::optional<RecordingGenerationFile> previous;
    std::vector<RecordingGenerationFile> archives;
    // 수용된 물리 행 전수다. 동일 identity 재시도도 별도 ordinal로 보존한다.
    std::vector<RecordingIdentityRow> rows;
};
struct RecordingIdentityFirstAcceptance {
    std::string mutation_id;
    std::uint64_t first_global_ordinal{0}, occurrences{0};
    RecordingIdentityRow first_row;
    // first_row.archive_slot은 shard-local이므로 체인 결과에서는 확정 descriptor를 함께 반환한다.
    RecordingGenerationFile first_archive;
};
struct RecordingIdentityChainResult {
    // 모든 shard에서 동일함을 확인한 store ID. 예약 행이 없는 chain에서도 비지 않는다.
    std::string store_id;
    std::uint64_t shards{0}, physical_rows{0};
    // 동일 ID 재시도를 포함한 모든 물리 행의 최대 ordinal. 빈 chain에는 값이 없다.
    std::optional<std::uint64_t> maximum_global_ordinal;
    // 검증이 실제 시작된 descriptor. 후속 snapshot의 head 결박에 사용한다.
    RecordingGenerationFile head;
    std::vector<RecordingIdentityFirstAcceptance> first_acceptances;
    RecordingOrderHistorySnapshot order_history;
};
struct RecordingIdentityChainLimits {
    std::uint64_t max_shard_bytes{0};
    std::size_t max_unique_ids{0}, max_archives{0};
};
// loader는 descriptor.name에 해당하는 bytes만 읽고 byte_limit보다 큰 버퍼를 만들지 않는다.
// filesystem 접근·nofollow/lease/FD 안전성은 loader 소유자 책임이다. codec은 파일을 열지 않는다.
using RecordingIdentityShardLoader = std::function<bool(const RecordingGenerationFile& descriptor,
    std::uint64_t byte_limit, std::string* bytes, std::string* error)>;
bool SerializeRecordingIdentityShard(const RecordingIdentityShard&, std::string*, std::string* error);
bool ParseRecordingIdentityShard(const std::string&, RecordingIdentityShard*, std::string* error);
// 이전 shard를 한 개씩 읽으며 임의 길이 chain을 검사한다. limits는 호출자 자원 admission이며
// 영속 형식 상한/제품 RSS 보장이 아니다. head부터 모든 descriptor 길이/SHA를 확인한다.
// 결과는 원문 mutation 의미·archive bytes·snapshot 완전성의 검증 증거가 아니다.
// 제품 Open/Append/Checkpoint에 연결하지 않은 순수 helper이며 그 제품 경로의 PASS가 아니다.
// ordinary/legacy 상태는 type/entity/최초 globalOrdinal을 순서대로 소비해 도출 가능하지만
// DerivedJobCommitted의 중첩 output과 원래 canonical digest는 cutover 원문 검증이 필요하다.
// 암호 없는 빌드에서도 값 codec은 작동하지만 chain 검증은 unsupported로 거부한다.
bool ValidateRecordingIdentityShardChain(const RecordingGenerationFile& head,
    const RecordingIdentityShardLoader&, const RecordingIdentityChainLimits&,
    RecordingIdentityChainResult*, std::string* error);
} // namespace recording
