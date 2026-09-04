// 파일 요약: 채널별 Recorder subscriber와 SegmentWriter 수명주기를 소유한다.
// 동작 요약: auxiliary stream acquire→subscribe→start 순서와 정확히 한 번 release를 보장한다.
#pragma once

#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>

#include "core/session_manager.h"
#include "recording/recording_store_port.h"
#include "recording/segment_writer.h"

namespace recording {

class RecordingSessionService {
public:
    using WriterFactory = std::function<std::unique_ptr<SegmentWriter>()>;

    struct StartResult {
        bool ok{false};
        bool started{false};
        std::string message;
    };

    RecordingSessionService(core::SessionManager& session_manager,
                            RecordingStorePort& store,
                            WriterFactory writer_factory);
    ~RecordingSessionService();

    StartResult StartChannel(const std::string& channel_id,
                             const std::string& stream_epoch_id,
                             const media::IngressRequest& request,
                             bool enabled);
    bool StopChannel(const std::string& channel_id);
    void StopAll();
    std::size_t ActiveChannelCount() const;
    // 시작 완료된 유일한 녹화 채널만 반환한다. handle/epoch는 외부에 노출하지 않는다.
    std::optional<std::string> ResolveRecordingChannel(const std::string& stream_key) const;

private:
    struct ChannelState;
    static std::int64_t NowMs();
    void OnPacket(const std::shared_ptr<ChannelState>& state, const media::Packet& packet);

    core::SessionManager& session_manager_;
    RecordingStorePort& store_;
    WriterFactory writer_factory_;
    mutable std::mutex mu_;
    bool closing_{false};
    std::unordered_map<std::string, std::shared_ptr<ChannelState>> channels_;
};

}  // namespace recording
